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
import { InlineKeyboard } from 'grammy';

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

    let text = `💰 *تفاصيل راتب شهر ${month}*\n\n`;
    text += `📌 الراتب الأساسي:    ${emp.base_salary.toFixed(2)} جنيه\n`;

    if (lateDeduction > 0) {
      text += `➖ خصم التأخير:      ${lateDeduction.toFixed(2)} جنيه\n`;
    }
    if (activeLoan > 0) {
      text += `➖ سلفة نشطة:        ${activeLoan.toFixed(2)} جنيه\n`;
    }
    text += `\n💵 *الصافي المتوقع: ${netSalary.toFixed(2)} جنيه*\n`;

    if (history.length > 0) {
      text += `\n📅 *الرواتب السابقة:*\n`;
      for (const p of history) {
        text += `• ${p.month}: ${p.net_salary.toFixed(2)} جنيه\n`;
      }
    }

    const kb = new InlineKeyboard();
    if (emp.role === 'admin') {
      kb.text('⚙️ لوحة الإدارة', 'admin_panel').row();
    }
    kb.text('🎛️ القائمة الرئيسية', 'back_to_main');

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
    await ctx.answerCallbackQuery();
  });

}
