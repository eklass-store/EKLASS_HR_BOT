// ============================================================
// src/handlers/callbacks/salary.callback.ts — Salary Details
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId } from '../../db/employees.db';
import { getEmployeePayroll } from '../../db/payroll.db';
import { getTotalActiveLoan } from '../../db/loans.db';
import { getSettings } from '../../db/settings.db';
import { getTotalLateMinutes } from '../../db/attendance.db';
import { getMainMenu } from '../../keyboards/main.keyboards';
import { getCurrentMonth } from '../../utils/time';

export function registerSalaryCallbacks(bot: Bot, env: Env): void {
  bot.callbackQuery('action_salary', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const month = getCurrentMonth(env.TIMEZONE);
    const settings = await getSettings(env);
    const deductionPerMin = parseFloat(settings['late_deduction_per_minute'] ?? '0');

    const lateMinutes  = await getTotalLateMinutes(env, emp.id, month);
    const lateDeduction = lateMinutes * deductionPerMin;
    const activeLoan   = await getTotalActiveLoan(env, emp.id);
    const totalDed     = lateDeduction + activeLoan;
    const netSalary    = emp.base_salary - totalDed;

    const history = await getEmployeePayroll(env, emp.id);

    let text = `💰 *تفاصيل الراتب — ${month}*\n\n`;
    text += `📌 الراتب الأساسي:    ${emp.base_salary.toFixed(2)} ريال\n`;
    text += `⏱ تأخير الشهر:       ${lateMinutes} دقيقة\n`;
    if (lateDeduction > 0)
      text += `➖ خصم التأخير:      ${lateDeduction.toFixed(2)} ريال\n`;
    if (activeLoan > 0)
      text += `➖ سلفة نشطة:        ${activeLoan.toFixed(2)} ريال\n`;
    text += `\n💵 *الصافي المتوقع: ${netSalary.toFixed(2)} ريال*\n`;

    if (history.length > 0) {
      text += '\n📊 *آخر الرواتب المصدرة:*\n';
      for (const p of history.slice(0, 3)) {
        text += `• ${p.month}: ${p.net_salary.toFixed(2)} ريال\n`;
      }
    }

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenu(emp.role === 'admin'),
    });
    await ctx.answerCallbackQuery();
  });
}
