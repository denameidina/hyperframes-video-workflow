# Contributing

Thanks for helping improve this HyperFrames video workflow.

## Local Setup

```bash
git submodule update --init --recursive vendor/whisper.cpp
cp .env.example .env
npm run test:repliz
```

Only add real credentials to `.env`. Do not commit raw footage, rendered videos,
transcripts with private data, or R2/Repliz receipts from live posts.

## Pull Request Checklist

- Run `npm run test:repliz` when changing `scripts/repliz-publish.mjs`.
- Run `npm run check` after editing HyperFrames `.html` compositions.
- Keep generated media out of git unless it is intentionally public and small.
- Update docs when changing agent workflow, publish flow, or setup requirements.
