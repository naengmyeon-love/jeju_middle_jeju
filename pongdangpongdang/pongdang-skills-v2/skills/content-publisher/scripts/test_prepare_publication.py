#!/usr/bin/env python3
"""Self-contained smoke test for prepare_publication.py."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main() -> int:
    script = Path(__file__).with_name("prepare_publication.py")
    with tempfile.TemporaryDirectory() as temp_dir:
        project = Path(temp_dir) / "project-output"
        (project / "video").mkdir(parents=True)
        (project / "metadata").mkdir(parents=True)
        video = project / "video" / "final.mp4"
        video.write_bytes(b"safe-test-video")
        video_sha = hashlib.sha256(video.read_bytes()).hexdigest()
        caption = "승인된 테스트 문안 #퐁당패밀리"
        caption_sha = hashlib.sha256(caption.encode("utf-8")).hexdigest()
        log = {
            "project_id": "publisher-smoke-test",
            "reviews": {"video": {"status": "passed"}},
            "approvals": {
                "final": {"status": "approved", "explicit": True},
                "distribution": {
                    "status": "approved",
                    "explicit": True,
                    "reviewer": "tester",
                    "approved_at": "2026-07-31T12:00:00+09:00",
                    "platforms": ["youtube"],
                    "content_sha256": video_sha,
                    "targets": [
                        {
                            "platform": "youtube",
                            "account_id": "test-channel",
                            "visibility": "private",
                            "caption": caption,
                            "caption_sha256": caption_sha,
                            "scheduled_at": None,
                        }
                    ],
                },
            },
        }
        (project / "metadata" / "production-log.json").write_text(
            json.dumps(log, ensure_ascii=False), encoding="utf-8"
        )
        result = subprocess.run(
            [
                sys.executable,
                str(script),
                "--project-root",
                str(project),
                "--platform",
                "youtube",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        manifest_path = Path(result.stdout.strip())
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        target = manifest["targets"][0]
        assert manifest["content_sha256"] == video_sha
        assert target["caption_sha256"] == caption_sha
        assert len(target["idempotency_key"]) == 64

        video.write_bytes(b"changed-after-approval")
        changed = subprocess.run(
            [
                sys.executable,
                str(script),
                "--project-root",
                str(project),
                "--platform",
                "youtube",
                "--check-only",
            ],
            capture_output=True,
            text=True,
        )
        assert changed.returncode == 2
        assert "changed after distribution approval" in changed.stderr
    print("prepare_publication smoke test: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
