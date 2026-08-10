#!/usr/bin/env python3
"""Validate distribution approval and create an idempotent publication manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path


SUPPORTED_PLATFORMS = {"youtube", "instagram", "tiktok"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fail(message: str) -> None:
    raise ValueError(message)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate a final video and distribution approval."
    )
    parser.add_argument(
        "--project-root",
        required=True,
        type=Path,
        help="Path to project-output",
    )
    parser.add_argument(
        "--platform",
        action="append",
        required=True,
        choices=sorted(SUPPORTED_PLATFORMS),
        help="Approved target platform; repeat for multiple platforms",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Manifest path (default: <project-root>/distribution/publication-manifest.json)",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate without writing a manifest",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = args.project_root.resolve()
    log_path = project_root / "metadata" / "production-log.json"
    video_path = project_root / "video" / "final.mp4"

    if not log_path.is_file():
        fail(f"production log not found: {log_path}")
    if not video_path.is_file():
        fail(f"approved final video not found: {video_path}")

    with log_path.open(encoding="utf-8") as stream:
        log = json.load(stream)

    video_review = log.get("reviews", {}).get("video", {})
    if video_review.get("status") != "passed":
        fail("video review must be passed")

    final_approval = log.get("approvals", {}).get("final", {})
    if final_approval.get("status") != "approved" or not final_approval.get("explicit"):
        fail("explicit final video approval is required")

    distribution = log.get("approvals", {}).get("distribution", {})
    if distribution.get("status") != "approved" or not distribution.get("explicit"):
        fail("explicit distribution approval is required")

    requested_platforms = sorted(set(args.platform))
    approved_platforms = sorted(set(distribution.get("platforms", [])))
    if requested_platforms != approved_platforms:
        fail(
            "requested platforms must exactly match approved platforms: "
            f"requested={requested_platforms}, approved={approved_platforms}"
        )

    approved_targets = distribution.get("targets")
    if not isinstance(approved_targets, list) or not approved_targets:
        fail("distribution approval must include at least one target")

    for target in approved_targets:
        if target.get("platform") not in SUPPORTED_PLATFORMS:
            fail(f"unsupported platform in approval: {target.get('platform')}")
    target_platforms = sorted({target["platform"] for target in approved_targets})
    if target_platforms != approved_platforms:
        fail("distribution targets must cover every approved platform exactly")
    if len(approved_targets) != len(approved_platforms):
        fail("distribution approval must contain exactly one target per platform")

    for target in approved_targets:
        if not target.get("account_id"):
            fail(f"account_id is required for {target.get('platform')}")
        if not target.get("visibility"):
            fail(f"visibility is required for {target.get('platform')}")
        if not target.get("caption"):
            fail(f"caption is required for {target.get('platform')}")
        if not target.get("caption_sha256"):
            fail(f"approved caption_sha256 is required for {target.get('platform')}")

    actual_video_sha = sha256_file(video_path)
    if distribution.get("content_sha256") != actual_video_sha:
        fail("final video changed after distribution approval")

    normalized_targets = []
    for target in sorted(approved_targets, key=lambda item: item["platform"]):
        caption_sha = hashlib.sha256(target["caption"].encode("utf-8")).hexdigest()
        approved_caption_sha = target["caption_sha256"]
        if approved_caption_sha != caption_sha:
            fail(f"caption changed after approval for {target['platform']}")
        identity = ":".join(
            [
                str(log.get("project_id", "")),
                target["platform"],
                target["account_id"],
                actual_video_sha,
                caption_sha,
                str(target.get("scheduled_at") or "immediate"),
                target["visibility"],
            ]
        )
        normalized_target = dict(target)
        normalized_target["caption_sha256"] = caption_sha
        normalized_target["idempotency_key"] = hashlib.sha256(
            identity.encode("utf-8")
        ).hexdigest()
        normalized_targets.append(normalized_target)

    manifest = {
        "schema_version": "1.0",
        "project_id": log.get("project_id"),
        "created_at": datetime.now().astimezone().isoformat(),
        "video_path": str(video_path),
        "content_sha256": actual_video_sha,
        "approved_by": distribution.get("reviewer"),
        "approved_at": distribution.get("approved_at"),
        "targets": normalized_targets,
    }

    if args.check_only:
        print(json.dumps(manifest, ensure_ascii=False, indent=2))
        return 0

    output_path = (
        args.output.resolve()
        if args.output
        else project_root / "distribution" / "publication-manifest.json"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as stream:
        json.dump(manifest, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(output_path)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
