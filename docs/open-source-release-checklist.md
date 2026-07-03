# Open Source Release Checklist

Use this before creating the public GitHub repo or pushing to it.

## Required

- [ ] Confirm the public repo name.
- [ ] Confirm MIT license is acceptable.
- [ ] Confirm raw footage, renders, transcripts, receipts, and `.env` remain untracked.
- [ ] Run `npm run test:repliz`.
- [ ] Run the secret scan from `README.md`.
- [ ] Review `THIRD_PARTY_NOTICES.md`, especially vendored `.claude` assets.

## Recommended Before First Public Push

- [ ] Decide whether to remove `.claude/skills/**` from the public repo and rely
      on upstream skill installation instead.
- [ ] Decide whether `index.html` should point to a public sample composition or
      stay as a local working composition requiring ignored media.
- [ ] Create GitHub repo.
- [ ] Add remote:

```bash
git remote add origin git@github.com:<owner>/<repo>.git
git push -u origin main
```
