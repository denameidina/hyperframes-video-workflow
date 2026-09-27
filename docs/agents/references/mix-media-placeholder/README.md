# Mix-media placeholder cut-out

Source of `docs/agents/references/style-examples/assets/placeholder-cutout.webm`:
a grey silhouette that breathes and nods, standing in for a matted speaker so the
mix-media examples show no real face. Real videos use `npm run video -- cutout`
on Dena's footage instead.

Re-render from the repo root (transparent WebM, then a smaller VP9 with alpha):

```bash
T=$(mktemp -d) && cp -R docs/agents/references/mix-media-placeholder/. "$T"/ && mkdir -p "$T/vendor" && cp vendor/gsap.min.js "$T/vendor/"
npx --yes hyperframes@0.7.24 render --format=webm -o "$T/raw.webm" "$T"
ffmpeg -y -loglevel error -c:v libvpx-vp9 -i "$T/raw.webm" -c:v libvpx-vp9 -pix_fmt yuva420p -crf 42 -b:v 0 -row-mt 1 -an docs/agents/references/style-examples/assets/placeholder-cutout.webm
rm -rf "$T"
```

The result must keep its alpha channel (`ffprobe` shows `ALPHA_MODE=1`) and stay
under 1 MB.
