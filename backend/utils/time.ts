// ============================================================
// src/utils/time.ts — Timezone-Aware Time Helpers
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
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return 0; // BUG-M FIX: تجنب NaN
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

export function diffMinutes(t1: string, t2: string): number {
  return toMinutes(t1) - toMinutes(t2);
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
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // التحقق من صحة التاريخ بمقارنة المكونات مباشرة
  const d = new Date(year, month - 1, day); // لا UTC — local
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * يتحقق من صحة صيغة الوقت HH:MM
 */
export function isValidTime(timeStr: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [h, m] = timeStr.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * يتحقق ما إذا كان التاريخ يوم جمعة أو سبت
 * @param dateStr YYYY-MM-DD
 */
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  return day === 5 || day === 6;
}
