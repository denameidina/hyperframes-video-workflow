# Studio background service (macOS)
Status: operating standard
Date: 2026-10-01

Kanonik untuk: instalasi dan operasi Studio sebagai LaunchAgent per akun macOS.
Perilaku: [RD-05-44–48](../requirements/rd-05-studio.md).
Keputusan: [ADR-0033](../adr/0033-studio-launchagent.md).

Studio tersedia di <http://127.0.0.1:4777> tanpa membuka Terminal. Layanan
otomatis dimulai **setelah login akun macOS**, termasuk setelah restart, dan
launchd menjalankan ulang proses yang berhenti. Saat Mac tidur/mati atau akun
logout, Studio tidak tersedia; pengaturan daya Mac tidak diubah.

## Install

Prasyarat: macOS, Node 22+ dan tool Studio yang sudah terpasang. Jalankan dari
root repo. Hentikan Studio manual yang memakai port 4777 terlebih dahulu.
Jika layanan sudah terdaftar, jalankan perintah Stop di bawah sebelum memasang
ulang. Template di `config/studio-launchagent.plist` memakai placeholder;
materialisasi ini menulis path absolut tanpa menyalin secret dari `.env`.

```bash
python3 <<'PY'
import os
import plistlib
import shutil
from pathlib import Path

root = Path.cwd().resolve()
assert (root / 'scripts/studio.mjs').is_file(), 'Jalankan dari root repo'
node = shutil.which('node')
assert node, 'Node 22+ harus terpasang'
node = str(Path(node).resolve())
home = Path.home()
logs = home / 'Library/Logs/DenaStudio'
agents = home / 'Library/LaunchAgents'
logs.mkdir(parents=True, exist_ok=True, mode=0o700)
agents.mkdir(parents=True, exist_ok=True, mode=0o700)
paths = []
for tool in ('claude', 'codex', 'npm', 'tmux', 'ffprobe', 'uv', 'tailscale'):
    found = shutil.which(tool)
    if found:
        paths.append(str(Path(found).parent))
paths.append(str(Path(node).parent))
paths += [str(home / '.local/bin'), str(home / '.bun/bin'),
          '/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin',
          '/usr/bin', '/bin', '/usr/sbin', '/sbin']
replacements = {
    '__NODE_BINARY__': node,
    '__PROJECT_ROOT__': str(root),
    '__EXECUTABLE_PATH__': ':'.join(dict.fromkeys(paths)),
    '__LOG_DIRECTORY__': str(logs),
}
def expand(value):
    if isinstance(value, str):
        for token, replacement in replacements.items():
            value = value.replace(token, replacement)
        return value
    if isinstance(value, list):
        return [expand(item) for item in value]
    if isinstance(value, dict):
        return {key: expand(item) for key, item in value.items()}
    return value
with (root / 'config/studio-launchagent.plist').open('rb') as source:
    config = expand(plistlib.load(source))
target = agents / 'com.dena.video-studio.plist'
with target.open('wb') as output:
    plistlib.dump(config, output)
os.chmod(target, 0o600)
print(target)
PY
plutil -lint "$HOME/Library/LaunchAgents/com.dena.video-studio.plist"
launchctl enable "gui/$(id -u)/com.dena.video-studio"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.dena.video-studio.plist"
```

launchd memakai Node langsung untuk menjalankan entrypoint yang sama dengan
`npm run studio`. Shell profile/nvm tidak dijalankan; PATH sudah berisi direktori
tool yang ditemukan saat instalasi. Studio tetap membaca `.env` dari repo.

LaunchAgent tidak mewarisi locale UTF-8 dari Terminal. Studio membaca metadata
sesi dengan `tmux -u list-panes` agar pemisah tab tetap utuh (RD-05-49). Tanpa
`-u`, tmux dapat mengganti tab menjadi `_`; daftar sesi lalu menampilkan slug
yang tergabung dengan timestamp/runtime/model/effort dan terminal menolak input
dengan `slug must use lowercase letters, digits, and dashes`. Setelah memperbarui
kode Studio, gunakan Restart lalu muat ulang halaman agar ID sesi dibaca kembali.

Jika Codex berhenti dengan `spawn ... ENOENT`, periksa executable memakai PATH
dari plist, bukan hanya dari Terminal. Instalasi Codex lama di direktori Node/nvm
dapat menutupi instalasi aktif di `.bun/bin`. Installer mendahulukan direktori
Claude/Codex yang dipilih shell sebelum direktori Node (RD-05-50). Node layanan
tetap memakai path absolut. Perbarui PATH plist dan reload layanan jika PATH
berubah; `kickstart` saja tidak memuat ulang konfigurasi plist.

Uji runtime dengan lingkungan PATH layanan:

```bash
python3 <<'PY'
import os
import plistlib
import subprocess
from pathlib import Path
config = plistlib.loads((Path.home() / 'Library/LaunchAgents/com.dena.video-studio.plist').read_bytes())
env = dict(os.environ, PATH=config['EnvironmentVariables']['PATH'])
for runtime in ('claude', 'codex'):
    subprocess.run([runtime, '--version'], env=env, check=True, timeout=15)
PY
```

Setelah mengedit plist, reload tanpa menonaktifkan autostart:

```bash
launchctl bootout "gui/$(id -u)/com.dena.video-studio"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.dena.video-studio.plist"
```

## Operasi

Status:

```bash
launchctl print "gui/$(id -u)/com.dena.video-studio"
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:4777/
```

Restart (juga setelah Tailscale baru terhubung):

```bash
launchctl kickstart -k "gui/$(id -u)/com.dena.video-studio"
```

Stop dan matikan autostart, termasuk pada login berikutnya:

```bash
launchctl disable "gui/$(id -u)/com.dena.video-studio"
launchctl bootout "gui/$(id -u)/com.dena.video-studio"
```

Aktifkan kembali setelah Stop:

```bash
launchctl enable "gui/$(id -u)/com.dena.video-studio"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.dena.video-studio.plist"
```

Log:

```bash
tail -n 50 "$HOME/Library/Logs/DenaStudio/stdout.log"
tail -n 50 "$HOME/Library/Logs/DenaStudio/stderr.log"
```

Jangan menjalankan `npm run studio` lagi ketika layanan aktif: keduanya memakai
port 4777. Jika repo dipindah, Node versi lama dihapus, atau tool pindah direktori,
Stop, ulangi Install dan periksa URL. `KeepAlive` akan menjalankan ulang Studio
walaupun proses keluar normal; untuk berhenti gunakan Stop, bukan membunuh PID.

## Verifikasi

Plist harus lolos `plutil -lint`; `launchctl print` harus menunjukkan
`state = running` dan PID, dan URL harus menjawab HTTP 200 (atau halaman login
jika `STUDIO_TOKEN` diatur). Uji restart dengan mengirim SIGTERM ke PID layanan
yang tercantum: launchd harus membuat PID baru dan URL kembali menjawab. Uji
ini tidak mengharuskan restart Mac; login berikutnya membaca plist yang sama.

Pemasangan workspace Dena pada 2026-10-01 telah diverifikasi: plist valid,
layanan berstatus `running` dan `enabled`, halaman serta `/api/state` menjawab
HTTP 200, dan tmux/Claude/Codex/ffprobe terdeteksi. Mengirim SIGTERM menghasilkan
PID baru dan halaman kembali menjawab HTTP 200. Mac tidak direstart untuk uji ini.

Referensi primer: [Apple — Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html).
