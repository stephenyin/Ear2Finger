"""Console entry point: `ear2finger` / `python -m ear2finger`."""
from __future__ import annotations

import argparse
import os
import sys


def main(argv: list[str] | None = None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    p = argparse.ArgumentParser(prog="ear2finger", description="Run the Ear2Finger web server.")
    p.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"), help="Bind host (default 127.0.0.1)")
    p.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "9528")),
        help="Bind port (default 9528)",
    )
    p.add_argument("--reload", action="store_true", help="Dev auto-reload")
    args = p.parse_args(argv)

    try:
        import uvicorn
    except ImportError:
        print("uvicorn is required. Install with: pip install ear2finger", file=sys.stderr)
        sys.exit(1)

    uvicorn.run(
        "ear2finger.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
