"""Learning progress per user (scores, completed state, etc.)."""
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ear2finger.auth import get_current_user
from ear2finger.database import LearningProgress, Sentence, User, Video, get_db
from ear2finger.demo_access import get_video_for_user
router = APIRouter()


class ProgressEntry(BaseModel):
    video_id: int
    sentence_id: int | None = None
    data: dict[str, Any]  # e.g. {"score": 1, "completed": true, "attempts": 2}


class ProgressResponse(BaseModel):
    video_id: int
    sentence_id: int | None
    data: dict


class WordStat(BaseModel):
    word: str
    total_count: int
    incorrect_count: int
    hint_count: int
    incorrect_rate: float
    hint_rate: float
    error_char_count: int
    error_char_rate: float
    average_spell_retry_times: float  # avg attempts to spell this word (1 + error_char_events / occurrences)
    latest_spell_retry_times: float  # retry count (1 + error_chars) for the most recent occurrence of this word


class DistributionStats(BaseModel):
    mean: float
    variance: float
    p25: float
    p50: float
    p75: float


class UserStats(BaseModel):
    total_videos_practiced: int
    total_sentences_practiced: int
    total_attempts: int
    total_words_seen: int
    unique_words_seen: int
    total_incorrect_words: int
    total_hints_used: int
    sentence_error_rate: Optional[DistributionStats] = None
    sentence_hint_usage: Optional[DistributionStats] = None
    top_incorrect_words: List[WordStat]
    top_hint_words: List[WordStat]


class DailyUserStats(BaseModel):
    date: str  # YYYY-MM-DD
    total_videos_practiced: int
    total_sentences_practiced: int
    total_attempts: int
    total_words_seen: int
    unique_words_seen: int
    total_incorrect_words: int
    total_hints_used: int
    sentence_error_rate: Optional[DistributionStats] = None
    sentence_hint_usage: Optional[DistributionStats] = None
    # Sentence length difficulty (per-day distribution of words per sentence)
    sentence_length_words: Optional[DistributionStats] = None
    # Vocabulary difficulty proxy (per-day distribution of characters per word occurrence)
    word_length_chars: Optional[DistributionStats] = None


class UserStats(BaseModel):
    total_videos_practiced: int
    total_sentences_practiced: int
    total_attempts: int
    total_words_seen: int
    unique_words_seen: int
    total_incorrect_words: int
    total_hints_used: int
    sentence_error_rate: Optional[DistributionStats] = None
    sentence_hint_usage: Optional[DistributionStats] = None
    # Global sentence-length difficulty (words per sentence)
    sentence_length_words: Optional[DistributionStats] = None
    # Global vocabulary difficulty proxy (characters per word occurrence)
    word_length_chars: Optional[DistributionStats] = None
    top_incorrect_words: List[WordStat]
    top_hint_words: List[WordStat]
    daily: List[DailyUserStats]


@router.get("/user/progress", response_model=list)
async def get_progress(
    video_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get learning progress for the current user. Optionally filter by video_id."""
    q = db.query(LearningProgress).filter(LearningProgress.user_id == current_user.id)
    if video_id is not None:
        q = q.filter(LearningProgress.video_id == video_id)
    rows = q.all()
    result = []
    for r in rows:
        data = json.loads(r.data) if r.data else {}
        result.append({"video_id": r.video_id, "sentence_id": r.sentence_id, "data": data})
    return result


@router.post("/user/progress")
async def upsert_progress(
    body: ProgressEntry,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update learning progress for a sentence/video."""
    video = get_video_for_user(db, current_user, body.video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if body.sentence_id is not None:
        sentence = db.query(Sentence).filter(
            Sentence.id == body.sentence_id,
            Sentence.video_id == body.video_id,
        ).first()
        if not sentence:
            raise HTTPException(status_code=404, detail="Sentence not found")

    existing = (
        db.query(LearningProgress)
        .filter(
            LearningProgress.user_id == current_user.id,
            LearningProgress.video_id == body.video_id,
            LearningProgress.sentence_id == body.sentence_id,
        )
        .first()
    )

    data_json = json.dumps(body.data)
    target: LearningProgress
    if existing:
        existing.data = data_json
        target = existing
    else:
        target = LearningProgress(
            user_id=current_user.id,
            video_id=body.video_id,
            sentence_id=body.sentence_id,
            data=data_json,
        )
        db.add(target)
    db.commit()
    db.refresh(target)

    return {"message": "Progress saved"}


def _compute_distribution(values: List[float]) -> Optional[DistributionStats]:
    if not values:
        return None
    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    sorted_vals = sorted(values)
    def quantile(q: float) -> float:
        if n == 1:
            return sorted_vals[0]
        idx = q * (n - 1)
        lo = int(idx)
        hi = min(lo + 1, n - 1)
        frac = idx - lo
        return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac
    return DistributionStats(
        mean=mean,
        variance=variance,
        p25=quantile(0.25),
        p50=quantile(0.5),
        p75=quantile(0.75),
    )


@router.get("/user/stats", response_model=UserStats)
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate statistics for the current user over all learning progress.

    Expected (but not strictly required) structure of LearningProgress.data per sentence:
    {
      "attempts": int,                            # number of attempts
      "total_words": int,                         # total words in the sentence
      "correct_words": ["word1", ...],            # words typed correctly
      "incorrect_words": ["word2", ...],          # words typed incorrectly
      "hint_words": ["word3", ...]                # words where hint was used
      ... any other fields ...
    }

    The endpoint is robust to missing fields and will simply ignore what is not present.
    """
    rows = (
        db.query(LearningProgress)
        .filter(LearningProgress.user_id == current_user.id)
        .order_by(LearningProgress.updated_at.asc())
        .all()
    )

    video_ids = set()
    total_sentences = 0
    total_attempts = 0
    total_words_seen = 0
    unique_words = set()
    total_incorrect_words = 0
    total_hints_used = 0

    # Per-word counters
    word_counts: Dict[str, Dict[str, int]] = {}

    # Per-sentence metrics
    sentence_error_rates: List[float] = []
    sentence_hint_counts: List[float] = []
    # Sentence length (words per sentence) as a difficulty proxy
    sentence_lengths: List[float] = []
    # Word length (characters per word occurrence) as a vocabulary difficulty proxy
    word_lengths: List[float] = []
    # Per-word error character counts
    word_error_chars: Dict[str, int] = {}
    # Per-word latest retry (1 + error_chars) for most recent occurrence
    word_latest_retry: Dict[str, float] = {}

    # Daily aggregations (keyed by YYYY-MM-DD)
    daily: Dict[str, Dict[str, Any]] = {}

    for r in rows:
        total_sentences += 1
        video_ids.add(r.video_id)
        data = json.loads(r.data) if r.data else {}

        day_key = None
        if getattr(r, "updated_at", None):
            try:
                day_key = r.updated_at.date().isoformat()
            except Exception:
                day_key = None

        attempts = int(data.get("attempts", 0) or 0)
        total_attempts += attempts

        incorrect_words = data.get("incorrect_words") or []
        hint_words = data.get("hint_words") or data.get("hinted_words") or []
        correct_words = data.get("correct_words") or []
        words_field = data.get("words") or []
        error_chars_field = data.get("error_chars") or []

        # Normalize to lists of strings
        def _as_words(value: Any) -> List[str]:
            if not value:
                return []
            if isinstance(value, str):
                return [value]
            if isinstance(value, list):
                return [str(w) for w in value if isinstance(w, (str, int, float))]
            return []

        incorrect_words = _as_words(incorrect_words)
        hint_words = _as_words(hint_words)
        correct_words = _as_words(correct_words)
        words_field = _as_words(words_field)

        all_words = set(incorrect_words + hint_words + correct_words)
        for w in all_words:
            unique_words.add(w)

        word_total_this_sentence: Dict[str, int] = {}
        for w in incorrect_words + correct_words:
            word_total_this_sentence[w] = word_total_this_sentence.get(w, 0) + 1

        total_words = int(data.get("total_words", 0) or 0)
        if not total_words and word_total_this_sentence:
            total_words = sum(word_total_this_sentence.values())
        total_words_seen += total_words

        incorrect_count = len(incorrect_words)
        hint_count = len(hint_words)
        total_incorrect_words += incorrect_count
        total_hints_used += hint_count

        if total_words > 0:
            error_rate = incorrect_count / float(total_words)
            sentence_error_rates.append(error_rate)
            sentence_lengths.append(float(total_words))
        if attempts > 0 or hint_count > 0:
            sentence_hint_counts.append(float(hint_count))

        # Update word-level counters
        for w, cnt in word_total_this_sentence.items():
            st = word_counts.setdefault(w, {"total": 0, "incorrect": 0, "hint": 0})
            st["total"] += cnt
            # Add each occurrence of the word for word-length difficulty stats
            word_lengths.extend([float(len(w))] * cnt)
        for w in incorrect_words:
            st = word_counts.setdefault(w, {"total": 0, "incorrect": 0, "hint": 0})
            st["incorrect"] += 1
        for w in hint_words:
            st = word_counts.setdefault(w, {"total": 0, "incorrect": 0, "hint": 0})
            st["hint"] += 1

        # Aggregate per-word error character counts and latest retry if provided
        if isinstance(words_field, list) and isinstance(error_chars_field, list) and len(words_field) == len(error_chars_field):
            for wf, ec in zip(words_field, error_chars_field):
                try:
                    ec_int = int(ec)
                except (TypeError, ValueError):
                    ec_int = 0
                w = str(wf)
                if ec_int > 0:
                    word_error_chars[w] = word_error_chars.get(w, 0) + ec_int
                # Latest retry = 1 + error_chars for this occurrence (overwrite so we keep most recent)
                word_latest_retry[w] = 1.0 + ec_int

        # Update daily stats
        if day_key:
            d = daily.setdefault(
                day_key,
                {
                    "video_ids": set(),
                    "sentences": 0,
                    "attempts": 0,
                    "words_seen": 0,
                    "unique_words": set(),
                    "incorrect_words": 0,
                    "hints": 0,
                    "sentence_error_rates": [],
                    "sentence_hint_counts": [],
                    "sentence_lengths": [],
                    "word_lengths": [],
                },
            )
            d["video_ids"].add(r.video_id)
            d["sentences"] += 1
            d["attempts"] += attempts
            d["words_seen"] += total_words
            d["incorrect_words"] += incorrect_count
            d["hints"] += hint_count
            for w in all_words:
                d["unique_words"].add(w)
            if total_words > 0:
                d["sentence_error_rates"].append(error_rate)
                d["sentence_lengths"].append(float(total_words))
            if attempts > 0 or hint_count > 0:
                d["sentence_hint_counts"].append(float(hint_count))
            # For word-length stats, approximate by using per-sentence average word length if we have words
            if total_words > 0 and word_total_this_sentence:
                # Average characters per word in this sentence
                total_chars = sum(len(w) * cnt for w, cnt in word_total_this_sentence.items())
                d["word_lengths"].append(total_chars / float(total_words))

    # Build word stats
    word_stats: List[WordStat] = []
    for w, st in word_counts.items():
        total = max(st["total"], 1)
        incorrect = st["incorrect"]
        hint = st["hint"]
        err_chars = word_error_chars.get(w, 0)
        avg_retry = 1.0 + (err_chars / float(total))  # at least 1 try; more errors -> higher avg tries
        latest_retry = word_latest_retry.get(w)
        if latest_retry is None:
            latest_retry = avg_retry
        word_stats.append(
            WordStat(
                word=w,
                total_count=total,
                incorrect_count=incorrect,
                hint_count=hint,
                incorrect_rate=incorrect / float(total),
                hint_rate=hint / float(total),
                error_char_count=err_chars,
                error_char_rate=err_chars / float(total),
                average_spell_retry_times=avg_retry,
                latest_spell_retry_times=latest_retry,
            )
        )

    # Sort top words, emphasizing words that were recently retried.
    # "Tricky" here means the most recent attempt required more than one try.
    tricky_word_stats = [
        ws for ws in word_stats if ws.latest_spell_retry_times > 1.0
    ]

    top_incorrect_words = sorted(
        tricky_word_stats,
        key=lambda ws: (
            ws.latest_spell_retry_times,
            ws.incorrect_count,
            ws.incorrect_rate,
            ws.error_char_count,
        ),
        reverse=True,
    )
    top_hint_words = sorted(
        [ws for ws in word_stats if ws.hint_count > 0],
        key=lambda ws: (ws.hint_count, ws.hint_rate),
        reverse=True,
    )[:50]

    # Build daily stats, sorted by date ascending
    daily_stats: List[DailyUserStats] = []
    for day_key, agg in sorted(daily.items(), key=lambda kv: kv[0]):
        daily_stats.append(
            DailyUserStats(
                date=day_key,
                total_videos_practiced=len(agg["video_ids"]),
                total_sentences_practiced=agg["sentences"],
                total_attempts=agg["attempts"],
                total_words_seen=agg["words_seen"],
                unique_words_seen=len(agg["unique_words"]),
                total_incorrect_words=agg["incorrect_words"],
                total_hints_used=agg["hints"],
                sentence_error_rate=_compute_distribution(agg["sentence_error_rates"]),
                sentence_hint_usage=_compute_distribution(agg["sentence_hint_counts"]),
                sentence_length_words=_compute_distribution(agg["sentence_lengths"]),
                word_length_chars=_compute_distribution(agg["word_lengths"]),
            )
        )

    return UserStats(
        total_videos_practiced=len(video_ids),
        total_sentences_practiced=total_sentences,
        total_attempts=total_attempts,
        total_words_seen=total_words_seen,
        unique_words_seen=len(unique_words),
        total_incorrect_words=total_incorrect_words,
        total_hints_used=total_hints_used,
        sentence_error_rate=_compute_distribution(sentence_error_rates),
        sentence_hint_usage=_compute_distribution(sentence_hint_counts),
        sentence_length_words=_compute_distribution(sentence_lengths),
        word_length_chars=_compute_distribution(word_lengths),
        top_incorrect_words=top_incorrect_words,
        top_hint_words=top_hint_words,
        daily=daily_stats,
    )
