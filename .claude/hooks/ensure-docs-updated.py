#!/usr/bin/env python3
"""Stop hook: blok bila implementasi ter-stage tanpa update docs."""
import json, subprocess, sys

# Folder/berkas implementasi nyata repo ini (hasil fase Scan hanoman reverse):
#   scripts/        -> CLI publish R2/Repliz + test
#   index.html      -> komposisi HyperFrames utama
#   compositions/   -> sub-komposisi HyperFrames
#   docs/agents/    -> kontrak workflow 7-agent (perilaku produksi)
IMPLEMENTATION_PREFIXES = ("scripts/", "index.html", "compositions/", "docs/agents/")
DOC_PREFIXES = ("internal/docs/", "AGENTS.md", "CLAUDE.md")

def staged():
    out = subprocess.run(["git", "diff", "--cached", "--name-only"],
                         text=True, capture_output=True).stdout
    return [l.strip() for l in out.splitlines() if l.strip()]

def main():
    paths = staged()
    impl = [p for p in paths if p.startswith(IMPLEMENTATION_PREFIXES)]
    docs = [p for p in paths if p.startswith(DOC_PREFIXES)]
    if impl and not docs:
        print(json.dumps({"decision": "block", "reason":
            "Implementasi ter-stage tanpa update internal/docs/**. Perbarui doc yang "
            "tersentuh + link di index, atau nyatakan 'no docs update needed'."}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
