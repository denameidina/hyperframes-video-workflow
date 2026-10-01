// Explicit publish times shared by Studio and the CLI. Date-less metadata keeps
// its existing behavior; this validator is for a user's explicit override.
export function normalizePublishTime(value, now = new Date()) {
  if (value === 'now') return 'now';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error('Pilih tanggal dan jam lengkap dengan zona waktu.');
  }
  const time = new Date(value);
  const local = value.slice(0, 10);
  const [year, month, day] = local.split('-').map(Number);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const [hour, minute, second = 0] = value.slice(11).split(/[:Z+-]/).map(Number);
  if (!Number.isFinite(time.getTime()) || month < 1 || month > 12 || day < 1 || day > maxDay || hour > 23 || minute > 59 || second >= 60) throw new Error('Tanggal jadwal tidak valid.');
  if (time.getTime() < now.getTime() + 60_000) throw new Error('Pilih jadwal setidaknya satu menit dari sekarang.');
  return time.toISOString();
}
