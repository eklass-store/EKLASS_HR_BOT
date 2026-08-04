import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId } from '../../db/employees.db';
import { getEmployeePayroll } from '../../db/payroll.db';
import { getTotalActiveLoan } from '../../db/loans.db';
import { getSettings } from '../../db/settings.db';
import { getTotalLateMinutes } from '../../db/attendance.db';
import { getMainMenu } from '../../keyboards/main.keyboards';
import { getCurrentMonth, getDaysInMonth, calcLateMinutes } from '../../utils/time';
import { InlineKeyboard } from 'grammy';

export function registerSalaryCallbacks(bot: Bot, env: Env): void {
  bot.callbackQuery('action_salary', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const month = getCurrentMonth(env.TIMEZONE);
    const settings = await getSettings(env);

    // BUG-F FIX: مزامنة مع منطق إصدار الراتب الفعلي
    const startTime = settings['work_start_time'] ?? '09:00';
    const endTime   = settings['work_end_time'] ?? '17:00';
    const workMinutes = calcLateMinutes(endTime, startTime) || 480;
    const daysInMonth = getDaysInMonth(month);
    const dailyRate = emp.base_salary / 30;
    const dynamicMonthSalary = dailyRate * daysInMonth; // الراتب الفعلي لهذا الشهر
    const minuteRate = dailyRate / workMinutes;

    const lateMinutes   = await getTotalLateMinutes(env, emp.id, month);
    const lateDeduction = lateMinutes * minuteRate;
    const activeLoan    = await getTotalActiveLoan(env, emp.id);
    const totalDed      = lateDeduction + activeLoan;
    const netSalary     = Math.max(0, dynamicMonthSalary - totalDed);

    const history = await getEmployeePayroll(env, emp.id);

    let text = `💰 *تفاصيل راتب شهر ${month}*\n\n`;
    text += `📌 الراتب الأساسي (30ي):    ${emp.base_salary.toFixed(2)} جنيه\n`;
    text += `📌 راتب هذا الشهر (${daysInMonth}ي): ${dynamicMonthSalary.toFixed(2)} جنيه\n`;

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

  bot.callbackQuery(/^confirm_payroll_(.+)$/, async (ctx) => {
    const month = ctx.match[1];
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    try {
      // Check if already confirmed
      const record = await env.DB.prepare(
        "SELECT is_confirmed FROM Payroll WHERE employee_id = ? AND month = ?"
      ).bind(emp.id, month).first();

      if (!record) {
        return ctx.answerCallbackQuery('لم يتم العثور على سجل راتب لهذا الشهر.');
      }

      if (record.is_confirmed) {
        return ctx.answerCallbackQuery('لقد قمت بتأكيد استلام هذا الراتب مسبقاً! ✅', { show_alert: true });
      }

      // Update the record
      await env.DB.prepare(
        "UPDATE Payroll SET is_confirmed = 1, confirmed_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND month = ?"
      ).bind(emp.id, month).run();

      // Edit message to remove button
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      await ctx.answerCallbackQuery('تم تأكيد الاستلام بنجاح! ✅', { show_alert: true });
    } catch (e) {
      console.error(e);
      await ctx.answerCallbackQuery('حدث خطأ أثناء التأكيد.', { show_alert: true });
    }
  });

}
