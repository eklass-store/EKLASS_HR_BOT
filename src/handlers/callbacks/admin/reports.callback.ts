// ============================================================
// src/handlers/callbacks/admin/reports.callback.ts
// تقرير الحضور اليومي للأدمن
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId } from '../../../db/employees.db';
import { getDailyReport } from '../../../db/attendance.db';
import { getAdminMenu } from '../../../keyboards/main.keyboards';
import { getNow } from '../../../utils/time';
import { escapeMarkdown } from '../../../utils/markdown';

export function registerAdminReportCallbacks(bot: Bot, env: Env): void {

  bot.callbackQuery('admin_report_today', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const { date } = getNow(env.TIMEZONE);
    const records = await getDailyReport(env, date);

    if (records.length === 0) {
      await ctx.editMessageText('لا يوجد موظفون مسجلون بعد.', {
        reply_markup: getAdminMenu(),
      });
      return ctx.answerCallbackQuery();
    }

    let present = 0, absent = 0, lateCount = 0;
    let presentLines = '';
    let absentLines = '';

    for (const rec of records) {
      if (rec.check_in_time) {
        present++;
        const late = rec.late_minutes > 0 ? ` ⚠️(${rec.late_minutes}د)` : '';
        if (rec.late_minutes > 0) lateCount++;
        const co = rec.check_out_time ? ` → ${rec.check_out_time}` : '';
        presentLines += `✅ ${escapeMarkdown(rec.full_name)}: ${rec.check_in_time}${co}${late}\n`;
      } else {
        absent++;
        absentLines += `❌ ${escapeMarkdown(rec.full_name)}\n`;
      }
    }

    let text = `📈 *تقرير الحضور — ${date}*\n\n`;
    if (presentLines) text += `*الحاضرون:*\n${presentLines}\n`;
    if (absentLines)  text += `*الغائبون:*\n${absentLines}\n`;
    text += `📊 *الإجمالي:* ${present} حاضر | ${absent} غائب | ${lateCount} متأخر`;

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: getAdminMenu(),
    });
    await ctx.answerCallbackQuery();
  });
}
