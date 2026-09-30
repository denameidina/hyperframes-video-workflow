#!/usr/bin/env python3
"""Stop hook: blok bila implementasi ter-stage tanpa update docs."""
import json, re, subprocess, sys

# Folder/berkas implementasi nyata repo ini (hasil fase Scan hanoman reverse):
#   scripts/        -> CLI, Studio, dan tests
#   index.html      -> template HyperFrames blank portrait
#   compositions/   -> sub-komposisi HyperFrames
#   docs/agents/    -> kontrak workflow 4 fase + references (perilaku produksi)
IMPLEMENTATION_PREFIXES = ("scripts/", "index.html", "compositions/", "docs/agents/")
DOC_PREFIXES = ("internal/docs/", "AGENTS.md", "CLAUDE.md")

def staged():
    out = subprocess.run(["git", "diff", "--cached", "--name-only", "-z"],
                         text=True, capture_output=True).stdout
    return [p for p in out.split("\0") if p]

def main():
    try:
        data = json.load(sys.stdin)
    except (ValueError, OSError):
        data = {}
    message = data.get("last_assistant_message") if isinstance(data, dict) else None
    mechanical = isinstance(message, str) and bool(re.search(
        r"^[ \t]*no docs update needed:[ \t]*\S[^\r\n]*$", message, re.MULTILINE | re.IGNORECASE
    ))
    paths = staged()
    impl = [p for p in paths if p.startswith(IMPLEMENTATION_PREFIXES)]
    docs = [p for p in paths if p.startswith(DOC_PREFIXES)]
    if impl and not docs and not mechanical:
        print(json.dumps({"decision": "block", "reason":
            "Implementasi ter-stage tanpa update internal/docs/**. Perbarui doc yang "
            "tersentuh + link di index, atau tulis 'no docs update needed: <alasan>' "
            "untuk perubahan mekanis."}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
