# AI Agent Initial Setup

Gunakan checklist ini saat agent baru masuk repo setelah clone.

## Start

1. Pastikan cwd adalah root repo `videos`.
2. Baca `AGENTS.md`.
3. Baca `internal/docs/README.md` dan `README.md`.
4. Baca `docs/initial-setup.md`.
5. Jalankan `git status --short --untracked-files=all` sebelum mengubah file.

## Required Checks

```bash
node --version
npm --version
git --version
python3 --version
cmake --version
ffmpeg -version
ffprobe -version
```

Node harus `v22` atau lebih baru.

## Ensure Local Directories

Folder ini harus ada walaupun kosong:

```text
shared/
videos/
references/
renders/
```

Jika hilang:

```bash
mkdir -p shared videos references renders
touch shared/.gitkeep videos/.gitkeep references/.gitkeep renders/.gitkeep
```

## Ensure whisper.cpp

Jangan pakai global `whisper-cli` untuk workflow Dena. Pakai path lokal:

```text
vendor/whisper.cpp/build/bin/whisper-cli
```

Setup:

```bash
git submodule update --init --recursive vendor/whisper.cpp
cmake -S vendor/whisper.cpp -B vendor/whisper.cpp/build
cmake --build vendor/whisper.cpp/build -j --config Release
sh vendor/whisper.cpp/models/download-ggml-model.sh large-v3-turbo
```

Verify:

```bash
test -x vendor/whisper.cpp/build/bin/whisper-cli
test -f vendor/whisper.cpp/models/ggml-large-v3-turbo.bin
vendor/whisper.cpp/build/bin/whisper-cli -h >/dev/null
```

## Transcription Command Template

```bash
npm run video -- sources <slug>    # temukan path dan id sumber speech di sources.json
mkdir -p videos/<slug>/transcripts
ffmpeg -y -i videos/<slug>/sources/<input-media> \
  -ar 16000 -ac 1 -c:a pcm_s16le \
  videos/<slug>/transcripts/<id>-audio.wav

vendor/whisper.cpp/build/bin/whisper-cli \
  -m vendor/whisper.cpp/models/ggml-large-v3-turbo.bin \
  -f videos/<slug>/transcripts/<id>-audio.wav \
  -l id \
  --prompt "Dena Meidina, HyperFrames, Codex, AGENTS.md, skills, motion overlay, transcript cut, IG, TikTok, AI workflow" \
  -oj -ojf \
  -of videos/<slug>/transcripts/<id>-whisper
```

Normalize the final transcript into:

```text
videos/<slug>/transcripts/<id>.json
```

Untuk sumber reusable, gunakan path `shared/<file>` dari `sources.json` sebagai
input FFmpeg. Story membuat `processed-transcript.json` setelah cut/speed;
timestamp sumber dan timestamp processed tidak boleh dipertukarkan.

## Work Rules

- For Dena social-video tasks, route through `docs/skills/dena-video-editing-workflow/SKILL.md`.
- Use the Story phase (`docs/agents/01-story.md`) for transcript/cut work.
- Use the Build phase (`docs/agents/03-build.md`) only when editing HyperFrames composition HTML.
- After editing video HTML, run `npm run video -- check <slug>`; root template HTML uses `npm run check`.
- Docs-only edits do not require `npm run check`.
- Do not commit or delete local media unless explicitly asked.
- Never upload to R2 or schedule Repliz until the user explicitly approves the final edit.
- Repliz publish requires `--approved`: `npm run repliz:publish -- --slug videos/<slug> --file <render.mp4> --approved`.
- R2 uses Wrangler with `CLOUDFLARE_ACCOUNT_ID`, bucket from `R2_BUCKET`, and `https://<r2-public-domain>`; do not add S3 keys or `wrangler.jsonc`.

For R2/Repliz work only, verify Wrangler:

```bash
npx wrangler --version
```
