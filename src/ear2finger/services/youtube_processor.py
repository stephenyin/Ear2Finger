import yt_dlp
import re
import subprocess
import tempfile
import shutil
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from ear2finger.database import Video, Sentence
import os

class YouTubeProcessor:
    def __init__(self, download_dir: str = None, audio_dir: str = None):
        # Use absolute paths relative to backend directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.download_dir = download_dir or os.path.join(backend_dir, "downloads")
        self.audio_dir = audio_dir or os.path.join(backend_dir, "audio")
        os.makedirs(self.download_dir, exist_ok=True)
        os.makedirs(self.audio_dir, exist_ok=True)

    def extract_video_info(self, youtube_url: str, video_id: str = None) -> Dict:
        """Extract video information, subtitles, and download MP3 audio using yt-dlp"""
        # First, get video info without downloading
        ydl_opts_info = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                video_id = video_id or info.get('id', 'unknown')
                video_title = info.get('title', 'Unknown')

                # Sanitize filename
                safe_title = "".join(c for c in video_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                safe_title = safe_title[:100]  # Limit length
                audio_filename = f"{video_id}_{safe_title}.mp3"
                audio_file_path = os.path.join(self.audio_dir, audio_filename)

                # Download subtitles using command-line yt-dlp
                # First try manual subtitles, then auto-generated subtitles
                subtitles_data = None
                with tempfile.TemporaryDirectory() as tmpdir:
                    try:
                        # Method 1: Try manual subtitles first
                        # Command: yt-dlp --write-subs --sub-lang en --sub-format srt --convert-subs srt --skip-download <URL>
                        cmd_manual = [
                            'yt-dlp',
                            '--no-playlist',
                            '--write-subs',
                            '--sub-lang', 'en',
                            '--sub-format', 'srt',
                            '--convert-subs', 'srt',
                            '--skip-download',
                            '--output', os.path.join(tmpdir, '%(id)s.%(ext)s'),
                            '--quiet',
                            youtube_url
                        ]

                        result_manual = subprocess.run(
                            cmd_manual,
                            capture_output=True,
                            text=True,
                            timeout=60
                        )

                        if result_manual.returncode == 0:
                            # Look for downloaded SRT subtitle files
                            for file in os.listdir(tmpdir):
                                if file.endswith('.en.srt') or (file.endswith('.srt') and 'en' in file):
                                    subtitle_path = os.path.join(tmpdir, file)
                                    with open(subtitle_path, 'r', encoding='utf-8') as f:
                                        subtitles_data = f.read()
                                    break
                                # Also check for files without language code (default English)
                                elif file.endswith('.srt') and not subtitles_data:
                                    subtitle_path = os.path.join(tmpdir, file)
                                    with open(subtitle_path, 'r', encoding='utf-8') as f:
                                        subtitles_data = f.read()

                        # Method 2: If manual subtitles failed, try auto-generated subtitles
                        # Command: yt-dlp --write-auto-subs --sub-lang en --sub-format srt --convert-subs srt --skip-download <URL>
                        if not subtitles_data:
                            cmd_auto = [
                                'yt-dlp',
                                '--no-playlist',
                                '--write-auto-subs',
                                '--sub-lang', 'en',
                                '--sub-format', 'srt',
                                '--convert-subs', 'srt',
                                '--skip-download',
                                '--output', os.path.join(tmpdir, '%(id)s.%(ext)s'),
                                '--quiet',
                                youtube_url
                            ]

                            result_auto = subprocess.run(
                                cmd_auto,
                                capture_output=True,
                                text=True,
                                timeout=60
                            )

                            if result_auto.returncode == 0:
                                # Look for downloaded SRT subtitle files
                                for file in os.listdir(tmpdir):
                                    if file.endswith('.en.srt') or (file.endswith('.srt') and 'en' in file):
                                        subtitle_path = os.path.join(tmpdir, file)
                                        with open(subtitle_path, 'r', encoding='utf-8') as f:
                                            subtitles_data = f.read()
                                        break
                                    # Also check for files without language code (default English)
                                    elif file.endswith('.srt') and not subtitles_data:
                                        subtitle_path = os.path.join(tmpdir, file)
                                        with open(subtitle_path, 'r', encoding='utf-8') as f:
                                            subtitles_data = f.read()
                    except subprocess.TimeoutExpired:
                        print("Warning: Subtitle download timed out")
                    except FileNotFoundError:
                        print("Warning: yt-dlp command not found. Falling back to Python API.")
                        # Fallback to Python API method
                        subtitles_data = self._extract_subtitles_via_api(ydl, info)
                    except Exception as e:
                        print(f"Warning: Failed to download subtitles via command-line: {str(e)}")
                        # Fallback to Python API method
                        subtitles_data = self._extract_subtitles_via_api(ydl, info)

                # Download MP3 audio file using command-line: yt-dlp -x --audio-format mp3 <URL>
                audio_downloaded = False
                if not os.path.exists(audio_file_path):
                    try:
                        # Use yt-dlp command-line to download and convert to MP3
                        # -x: extract audio only
                        # --audio-format mp3: convert to MP3 format
                        temp_output = os.path.join(self.audio_dir, f'{video_id}_temp.%(ext)s')
                        cmd = [
                            'yt-dlp',
                            '--no-playlist',
                            '-x',  # Extract audio only
                            '--audio-format', 'mp3',
                            '--output', temp_output,
                            '--quiet',
                            youtube_url
                        ]

                        result = subprocess.run(
                            cmd,
                            capture_output=True,
                            text=True,
                            timeout=300  # 5 minute timeout for audio download
                        )

                        if result.returncode == 0:
                            # Find the downloaded MP3 file
                            for file in os.listdir(self.audio_dir):
                                if file.startswith(f'{video_id}_temp') and file.endswith('.mp3'):
                                    temp_path = os.path.join(self.audio_dir, file)
                                    if os.path.exists(temp_path):
                                        shutil.move(temp_path, audio_file_path)
                                        audio_downloaded = True
                                        break
                        else:
                            print(f"Warning: Audio download failed: {result.stderr}")
                            audio_file_path = None
                    except subprocess.TimeoutExpired:
                        print("Warning: Audio download timed out")
                        audio_file_path = None
                    except FileNotFoundError:
                        print("Warning: yt-dlp command not found. Cannot download audio.")
                        audio_file_path = None
                    except Exception as e:
                        # If audio download fails, continue without audio
                        print(f"Warning: Failed to download audio: {str(e)}")
                        # Check if FFmpeg might be missing
                        if "ffmpeg" in str(e).lower():
                            print("Note: FFmpeg is required for MP3 conversion. Install FFmpeg for audio download.")
                        audio_file_path = None
                else:
                    # Audio file already exists
                    audio_downloaded = True

                return {
                    'title': video_title,
                    'duration': info.get('duration', 0),
                    'subtitles': subtitles_data,
                    'video_id': video_id,
                    'audio_file_path': audio_file_path if audio_downloaded else None,
                }
        except Exception as e:
            raise Exception(f"Failed to extract video info: {str(e)}")

    def _extract_subtitles_via_api(self, ydl, info) -> Optional[str]:
        """Fallback method to extract subtitles using Python API"""
        subtitles_data = None

        # Method 1: Try manual subtitles first
        if 'subtitles' in info and info['subtitles']:
            for lang_code, subtitle_list in info['subtitles'].items():
                if lang_code.startswith('en') or lang_code == 'en':
                    if subtitle_list and len(subtitle_list) > 0:
                        subtitle_url = subtitle_list[0].get('url')
                        if subtitle_url:
                            try:
                                subtitles_data = ydl.urlopen(subtitle_url).read().decode('utf-8')
                                break
                            except:
                                continue

        # Method 2: Try automatic captions if manual subtitles not found
        if not subtitles_data and 'automatic_captions' in info and info['automatic_captions']:
            for lang_code, caption_list in info['automatic_captions'].items():
                if lang_code.startswith('en') or lang_code == 'en':
                    if caption_list and len(caption_list) > 0:
                        caption_url = caption_list[0].get('url')
                        if caption_url:
                            try:
                                subtitles_data = ydl.urlopen(caption_url).read().decode('utf-8')
                                break
                            except:
                                continue

        return subtitles_data

    @staticmethod
    def _is_punctuation_only(text: str) -> bool:
        """
        Return True if the given text contains no alphanumeric characters
        (i.e. it's only punctuation/whitespace like '>>', '...', '♪♪', etc.).
        """
        if not text:
            return False
        stripped = text.strip()
        if not stripped:
            return False
        return not any(ch.isalnum() for ch in stripped)

    def parse_subtitles(self, subtitle_content: str) -> List[Dict]:
        """Parse subtitle content (SRT or VTT format) into timestamped segments"""
        if not subtitle_content:
            return []

        # Detect format by checking first few lines
        first_lines = subtitle_content.strip().split('\n')[:5]
        is_srt = any(line.strip().isdigit() for line in first_lines if line.strip())

        if is_srt:
            return self._parse_srt_subtitles(subtitle_content)
        else:
            return self._parse_vtt_subtitles(subtitle_content)

    def _parse_srt_subtitles(self, srt_content: str) -> List[Dict]:
        """Parse SRT subtitle content into timestamped segments"""
        if not srt_content:
            return []

        segments = []
        lines = srt_content.split('\n')
        i = 0

        while i < len(lines):
            line = lines[i].strip()

            # Skip empty lines
            if not line:
                i += 1
                continue

            # Check if this is a sequence number (SRT format starts with number)
            if line.isdigit():
                i += 1
                if i >= len(lines):
                    break

                # Next line should be the timestamp
                timestamp_line = lines[i].strip()
                # SRT format: 00:00:00,000 --> 00:00:00,000 (comma for milliseconds)
                timestamp_match = re.match(r'(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})', timestamp_line)

                if timestamp_match:
                    # Convert timestamp to seconds
                    start_seconds = (
                        int(timestamp_match.group(1)) * 3600 +
                        int(timestamp_match.group(2)) * 60 +
                        int(timestamp_match.group(3)) +
                        int(timestamp_match.group(4)) / 1000
                    )
                    end_seconds = (
                        int(timestamp_match.group(5)) * 3600 +
                        int(timestamp_match.group(6)) * 60 +
                        int(timestamp_match.group(7)) +
                        int(timestamp_match.group(8)) / 1000
                    )

                    i += 1
                    # Collect text lines until empty line
                    text_lines = []
                    while i < len(lines) and lines[i].strip():
                        text_lines.append(lines[i].strip())
                        i += 1

                    if text_lines:
                        segments.append({
                            'start_time': start_seconds,
                            'end_time': end_seconds,
                            'text': ' '.join(text_lines)
                        })
                else:
                    i += 1
            else:
                i += 1

        return segments

    def _parse_vtt_subtitles(self, vtt_content: str) -> List[Dict]:
        """Parse WebVTT subtitle content into timestamped segments"""
        if not vtt_content:
            return []

        segments = []
        lines = vtt_content.split('\n')
        current_segment = None

        for line in lines:
            line = line.strip()

            # Skip WebVTT header and empty lines
            if not line or line.startswith('WEBVTT') or line.startswith('NOTE'):
                continue

            # Check for timestamp line (format: 00:00:00.000 --> 00:00:00.000)
            timestamp_match = re.match(r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})', line)
            if timestamp_match:
                # Convert timestamp to seconds
                start_seconds = (
                    int(timestamp_match.group(1)) * 3600 +
                    int(timestamp_match.group(2)) * 60 +
                    int(timestamp_match.group(3)) +
                    int(timestamp_match.group(4)) / 1000
                )
                end_seconds = (
                    int(timestamp_match.group(5)) * 3600 +
                    int(timestamp_match.group(6)) * 60 +
                    int(timestamp_match.group(7)) +
                    int(timestamp_match.group(8)) / 1000
                )

                if current_segment:
                    segments.append(current_segment)

                current_segment = {
                    'start_time': start_seconds,
                    'end_time': end_seconds,
                    'text': ''
                }
            elif current_segment and line:
                # Add text to current segment
                if current_segment['text']:
                    current_segment['text'] += ' ' + line
                else:
                    current_segment['text'] = line

        # Add last segment
        if current_segment:
            segments.append(current_segment)

        return segments

    def segment_into_sentences(self, segments: List[Dict]) -> List[Dict]:
        """
        Segment subtitle segments into sentences without estimating timestamps.

        Rules:
        1. All start_time / end_time values must come directly from the original
           subtitle segments (we only reuse/merge them, never compute new times).
        2. The resulting segments must have strictly increasing start_time values.
           If a segment's start_time is equal to or less than the previous one,
           merge it into the previous segment until the monotonic property holds.
        """

        # Filter out empty and punctuation-only segments, then ensure
        # segments are processed in chronological order.
        cleaned_segments: List[Dict] = []
        for s in segments:
            text = s.get("text", "")
            if not text:
                continue
            stripped = text.strip()
            if not stripped:
                continue
            if self._is_punctuation_only(stripped):
                continue
            cleaned = dict(s)
            cleaned["text"] = stripped
            cleaned_segments.append(cleaned)

        sorted_segments = sorted(
            cleaned_segments,
            key=lambda s: s["start_time"],
        )

        merged_segments: List[Dict] = []
        current: Optional[Dict] = None

        for seg in sorted_segments:
            text = seg["text"]
            start = seg["start_time"]
            end = seg["end_time"]

            if current is None:
                # Start a new merged segment
                current = {
                    "text": text,
                    "start_time": start,
                    "end_time": end,
                }
                continue

            current_text = current["text"]
            current_start = current["start_time"]

            # Decide whether this segment must be merged into the current one:
            #  - if its start_time is not strictly greater than the current start_time
            #    (enforce monotonically increasing start times), OR
            must_merge_for_time = start <= current_start

            if must_merge_for_time:
                # Merge: keep the first start_time, extend end_time, and concatenate text
                if text.strip():
                    if current_text and not current_text.endswith(" "):
                        current["text"] = current_text + " " + text.strip()
                    else:
                        current["text"] = (current_text + text).strip()
                current["end_time"] = end
            else:
                # Finalize current and start a new one
                merged_segments.append(current)
                current = {
                    "text": text,
                    "start_time": start,
                    "end_time": end,
                }

        if current is not None and current.get("text", "").strip():
            merged_segments.append(current)

        # Build base sentence list from merged segments, using their original times
        base_sentences: List[Dict] = []
        for seg in merged_segments:
            base_sentences.append(
                {
                    "sentence_text": seg["text"].strip(),
                    "start_time": float(seg["start_time"]),
                    "end_time": float(seg["end_time"]),
                }
            )

        # Merge every 2 consecutive sentences into a longer one:
        merged_pairs: List[Dict] = []
        i = 0
        n = len(base_sentences)
        while i < n:
            first = base_sentences[i]
            if i + 1 < n:
                second = base_sentences[i + 1]
                merged_pairs.append(
                    {
                        "sentence_text": (first["sentence_text"] + " " + second["sentence_text"]).strip(),
                        "start_time": first["start_time"],
                        "end_time": second["end_time"],
                    }
                )
                i += 2
            else:
                merged_pairs.append(first)
                i += 1

        # Assign sentence_index after merging, preserving chronological order
        sentences: List[Dict] = []
        for idx, seg in enumerate(merged_pairs):
            sentences.append(
                {
                    "sentence_text": seg["sentence_text"],
                    "start_time": seg["start_time"],
                    "end_time": seg["end_time"],
                    "sentence_index": idx,
                }
            )

        return sentences

    def process_youtube_video(self, youtube_url: str, db: Session, user_id: int) -> Dict:
        """Process a YouTube video: extract, segment, and store in database"""
        youtube_url = youtube_url.strip().rstrip(',;')
        existing_video = db.query(Video).filter(Video.youtube_url == youtube_url).first()
        if existing_video:
            if existing_video.user_id is not None and existing_video.user_id != user_id:
                raise ValueError("This video URL was already imported by another user.")

            # If this video was soft-deleted for this user, restore it instead of
            # treating it as missing. This allows re-importing a previously deleted
            # lesson without causing downstream "Video not found" errors.
            if getattr(existing_video, "deleted_at", None) is not None:
                existing_video.deleted_at = None
                db.commit()

            if existing_video.user_id != user_id:
                existing_video.user_id = user_id
                db.commit()
            sentences = db.query(Sentence).filter(Sentence.video_id == existing_video.id).order_by(Sentence.sentence_index).all()
            return {
                'video_id': existing_video.id,
                'title': existing_video.title,
                'duration': existing_video.duration,
                'sentence_count': len(sentences),
                'message': 'Video already processed'
            }

        # Extract video info and subtitles
        video_info = self.extract_video_info(youtube_url)

        if not video_info.get('subtitles'):
            raise Exception("No subtitles available for this video")

        # Parse subtitles (SRT or VTT format)
        segments = self.parse_subtitles(video_info['subtitles'])

        if not segments:
            raise Exception("Could not parse subtitles from video")
        # Segment into sentences
        sentences = self.segment_into_sentences(segments)

        if not sentences:
            raise Exception("Could not segment subtitles into sentences")

        # Store in database
        video = Video(
            user_id=user_id,
            youtube_url=youtube_url,
            title=video_info['title'],
            duration=video_info['duration'],
            audio_file_path=video_info.get('audio_file_path')
        )
        db.add(video)
        db.flush()  # Get video ID

        # Store sentences
        for sentence_data in sentences:
            sentence = Sentence(
                video_id=video.id,
                sentence_text=sentence_data['sentence_text'],
                start_time=sentence_data['start_time'],
                end_time=sentence_data['end_time'],
                sentence_index=sentence_data['sentence_index']
            )
            db.add(sentence)

        db.commit()

        return {
            'video_id': video.id,
            'title': video.title,
            'duration': video.duration,
            'sentence_count': len(sentences),
            'message': 'Video processed successfully'
        }
