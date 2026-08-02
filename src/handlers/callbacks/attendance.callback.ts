// ============================================================
// src/handlers/callbacks/attendance.callback.ts
// FIX BUG-01: فحص مسبق قبل INSERT + UNIQUE constraint في DB
// FIX BUG-02: getNow() بتوقيت محلي
// FIX BUG-03: calcLateMinutes() حسابي لا نصي
// FIX BUG-08: recordCheckout يستهدف سجلاً بدون check_out فقط
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId } from '../../db/employees.db';
import {
  getTodayAttendance,
  createAttendance,
  recordCheckout,
  getAttendanceHistory,
} from '../../db/attendance.db';
import { getSettings } from '../../db/settings.db';
import { getMainMenu } from '../../keyboards/main.keyboards';
import { getNow, calcLateMinutes, getCurrentMonth } from '../../utils/time';

export function registerAttendanceCallbacks(bot: Bot, env: Env): void {

  // ── تسجيل الحضور ──────────────────────────────────────────
  bot.callbackQuery('action_checkin', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const { date, time } = getNow(env.TIMEZONE);

    // FIX BUG-01: فحص مسبق قبل الإدراج
    const existing = await getTodayAttendance(env, emp.id, date);
    if (existing) {
      return ctx.answerCallbackQuery(
        `⚠️ سجّلت حضورك اليوم الساعة ${existing.check_in_time}!`
      );
    }

    const settings = await getSettings(env);
    const startTime = settings['work_start_time'] ?? '09:00';
    // FIX BUG-03: calcLateMinutes — حساب رقمي دقيق
    const lateMinutes = calcLateMinutes(time, startTime);

    await createAttendance(env, emp.id, date, time, lateMinutes);

    let msg = `✅ تم تسجيل حضورك الساعة *${time}*`;
    if (lateMinutes > 0) {
      msg += `\n⚠️ تأخرت *${lateMinutes}* دقيقة عن موعد الدوام (${startTime}).`;
    }

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenu(emp.role === 'admin'),
    });
    await ctx.answerCallbackQuery();
  });

  // ── تسجيل الانصراف ────────────────────────────────────────
  bot.callbackQuery('action_checkout', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const { date, time } = getNow(env.TIMEZONE);

    const existing = await getTodayAttendance(env, emp.id, date);
    if (!existing) {
      return ctx.answerCallbackQuery('⚠️ لم تسجّل حضورك اليوم بعد!');
    }
    if (existing.check_out_time) {
      return ctx.answerCallbackQuery(
        `⚠️ سجّلت انصرافك اليوم الساعة ${existing.check_out_time}!`
      );
    }

    // FIX BUG-08: يستهدف السجل الذي check_out_time IS NULL فقط
    await recordCheckout(env, emp.id, date, time);

    await ctx.editMessageText(
      `🌙 تم تسجيل انصرافك الساعة *${time}*\nنتمنى لك وقتاً ممتعاً!`,
      { parse_mode: 'Markdown', reply_markup: getMainMenu(emp.role === 'admin') }
    );
    await ctx.answerCallbackQuery();
  });

  // ── سجل الحضور الشهري ─────────────────────────────────────
  bot.callbackQuery('action_history', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const month = getCurrentMonth(env.TIMEZONE);
    const records = await getAttendanceHistory(env, emp.id, month);

    if (records.length === 0) {
      await ctx.editMessageText(
        `📋 لا توجد سجلات حضور لشهر ${month}.`,
        { reply_markup: getMainMenu(emp.role === 'admin') }
      );
      return ctx.answerCallbackQuery();
    }

    let text = `📋 *سجل الحضور — ${month}*\n\n`;
    let totalLate = 0;
    for (const rec of records) {
      const ci = rec.check_in_time ?? '—';
      const co = rec.check_out_time ?? '—';
      const lateStr = rec.late_minutes > 0 ? ` ⚠️(${rec.late_minutes}د)` : '';
      text += `📅 ${rec.date}: ${ci} ← ${co}${lateStr}\n`;
      totalLate += rec.late_minutes;
    }
    text += `\n⏱ إجمالي التأخير: *${totalLate}* دقيقة`;

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenu(emp.role === 'admin'),
    });
    await ctx.answerCallbackQuery();
  });
}
