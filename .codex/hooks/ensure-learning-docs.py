#!/usr/bin/env python3
"""Codex hook: require docs updates for Dena workflow learnings."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


LEARNING_KEYWORDS = (
    "learning",
    "learn",
    "pelajaran",
    "fixing",
    "next kita",
    "next akan",
    "kurang akurat",
    "terlalu banyak",
    "caption drift",
    "over-cut",
    "burn token",
)

DOC_PREFIXES = ("docs/",)
DOC_EXACT = {"AGENTS.md", "CLAUDE.md"}
DOC_SUFFIXES = (".md", ".mdx", ".rst")

WORKFLOW_PREFIXES = (
    ".codex/",
    ".claude/skills/",
    "compositions/",
    "scripts/",
)
WORKFLOW_EXACT = {
    "index.html",
    "package.json",
    "package-lock.json",
    "hyperframes.json",
    "meta.json",
}
IGNORED_PREFIXES = (
    ".git/",
    "node_modules/",
    "vendor/",
    "videos/",
)


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, check=False)


def git_root(cwd: Path) -> Path | None:
    result = run(["git", "rev-parse", "--show-toplevel"], cwd)
    return Path(result.stdout.strip()) if result.returncode == 0 else None


def git_path(root: Path, name: str) -> Path:
    result = run(["git", "rev-parse", "--git-path", name], root)
    return Path(result.stdout.strip()) if result.returncode == 0 else root / ".git" / name


def payload() -> dict[str, Any]:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def all_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        out: list[str] = []
        for item in value.values():
            out.extend(all_strings(item))
        return out
    if isinstance(value, list):
        out = []
        for item in value:
            out.extend(all_strings(item))
        return out
    return []


def prompt_text(data: dict[str, Any]) -> str:
    preferred = [data.get(key) for key in ("prompt", "message", "user_prompt", "text", "input")]
    text = "\n".join(item for item in preferred if isinstance(item, str))
    return text or "\n".join(all_strings(data))


def is_doc(path: str) -> bool:
    return path in DOC_EXACT or path.startswith(DOC_PREFIXES) or path.endswith(DOC_SUFFIXES)


def is_workflow(path: str) -> bool:
    if path.startswith(IGNORED_PREFIXES) or is_doc(path):
        return False
    return path in WORKFLOW_EXACT or path.startswith(WORKFLOW_PREFIXES)


def status_paths(root: Path) -> list[str]:
    result = run(["git", "status", "--short", "--untracked-files=all"], root)
    if result.returncode != 0:
        return []

    paths: list[str] = []
    for raw in result.stdout.splitlines():
        line = raw.strip()
        if not line:
            continue
        path = line[3:] if len(line) > 3 else line
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.append(path)
    return paths


def newest_doc_mtime_ns(root: Path) -> int:
    newest = 0
    for exact in DOC_EXACT:
        path = root / exact
        if path.exists():
            newest = max(newest, path.stat().st_mtime_ns)

    docs = root / "docs"
    if docs.exists():
        for path in docs.rglob("*"):
            if path.is_file() and path.suffix in {".md", ".mdx", ".rst"}:
                newest = max(newest, path.stat().st_mtime_ns)

    return newest


def record_learning(root: Path, text: str, matched: str) -> None:
    state = {
        "matched": matched,
        "prompt_preview": text[:300],
        "started_at_ns": time.time_ns(),
    }
    path = git_path(root, "codex-learning-docs-required.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2), encoding="utf-8")


def read_state(root: Path) -> dict[str, Any] | None:
    path = git_path(root, "codex-learning-docs-required.json")
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"started_at_ns": 0, "matched": "unknown"}
    return data if isinstance(data, dict) else {"started_at_ns": 0, "matched": "unknown"}


def clear_state(root: Path) -> None:
    path = git_path(root, "codex-learning-docs-required.json")
    if path.exists():
        path.unlink()


def user_prompt_submit(root: Path, data: dict[str, Any]) -> int:
    text = prompt_text(data)
    lowered = text.lower()
    for keyword in LEARNING_KEYWORDS:
        if keyword in lowered:
            record_learning(root, text, keyword)
            break
    return 0


def block(reason: str) -> int:
    print(json.dumps({"decision": "block", "reason": reason}))
    return 0


def stop(root: Path, data: dict[str, Any]) -> int:
    if data.get("stop_hook_active") is True:
        return 0

    paths = status_paths(root)
    docs_dirty = any(is_doc(path) for path in paths)
    workflow_dirty = [path for path in paths if is_workflow(path)]
    state = read_state(root)

    if state:
        started_at = int(state.get("started_at_ns") or 0)
        docs_updated_after_prompt = newest_doc_mtime_ns(root) >= started_at
        if not docs_updated_after_prompt:
            return block(
                "Learning prompt detected, but no docs were updated in this turn. "
                "Update `docs/**`, `AGENTS.md`, or `CLAUDE.md` with the learning before finishing."
            )
        clear_state(root)
        return 0

    if workflow_dirty and not docs_dirty:
        shown = "\n".join(f"- {path}" for path in workflow_dirty[:12])
        return block(
            "Workflow/project files changed without docs changes. "
            "Update the relevant Dena docs before finishing.\n\n"
            f"Files:\n{shown}"
        )

    return 0


def self_test() -> int:
    assert is_doc("docs/agents/01-story.md")
    assert is_doc("AGENTS.md")
    assert is_workflow("index.html")
    assert is_workflow(".codex/hooks.json")
    assert not is_workflow("videos/0702-2/caption-beats.json")
    assert not is_workflow("vendor/whisper.cpp/build/bin/whisper-cli")
    print("ensure-learning-docs self-test passed")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    data = payload()
    root = git_root(Path(data.get("cwd") or os.getcwd()))
    if root is None:
        return 0

    event = os.environ.get("DENA_LEARNING_DOC_HOOK_EVENT", "stop")
    if event == "user_prompt_submit":
        return user_prompt_submit(root, data)
    return stop(root, data)


if __name__ == "__main__":
    raise SystemExit(main())
