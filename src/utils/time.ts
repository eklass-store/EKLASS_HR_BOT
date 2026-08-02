// ============================================================
// src/utils/time.ts — Timezone-Aware Time Helpers
// FIX BUG-02: استبدال toISOString() (UTC) بـ Intl API
// FIX BUG-03: حساب التأخير بالدقائق الحقيقية بدل مقارنة نصية
// ============================================================

/**
 * يرجع التاريخ والوقت الحاليين بالتوقيت المحلي
 */
export function getNow(timezone = 'Africa/Cairo'): { date: string; time: string } {
  const now = new Date();

  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // → "YYYY-MM-DD"

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now); // → "HH:MM"

  return { date, time };
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * يحسب دقائق التأخير بدقة رقمية (لا مقارنة نصية)
 * FIX BUG-03
 */
export function calcLateMinutes(checkInTime: string, workStartTime: string): number {
  const diff = toMinutes(checkInTime) - toMinutes(workStartTime);
  return diff > 0 ? diff : 0;
}

/**
 * يرجع الشهر الحالي بصيغة YYYY-MM
 */
export function getCurrentMonth(timezone = 'Africa/Cairo'): string {
  const { date } = getNow(timezone);
  return date.substring(0, 7);
}

/**
 * يرجع عدد الأيام في شهر معين
 * @param month YYYY-MM
 */
export function getDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * يتحقق من صحة صيغة التاريخ YYYY-MM-DD
 */
export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (!(d instanceof Date) || isNaN(d.getTime())) return false;
  // Ensure the parsed date exactly matches the input (prevents 2024-02-30 -> 2024-03-01)
  return d.toISOString().startsWith(dateStr);
}

/**
 * يتحقق من صحة صيغة الوقت HH:MM
 */
export function isValidTime(timeStr: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [h, m] = timeStr.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}
