// ============================================================
// src/handlers/callbacks/admin/payroll.callback.ts
// FIX BUG-05: handler حقيقي لـ admin_payroll
// إصدار الرواتب مع حساب خصومات التأخير والسلف
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId, getAllEmployees } from '../../../db/employees.db';
import { issuePayroll, hasPayrollForMonth } from '../../../db/payroll.db';
import { getTotalLateMinutes } from '../../../db/attendance.db';
import { getTotalActiveLoan } from '../../../db/loans.db';
import { getSettings } from '../../../db/settings.db';
import { getAdminMenu } from '../../../keyboards/main.keyboards';
import { getCurrentMonth } from '../../../utils/time';

export function registerAdminPayrollCallbacks(bot: Bot, env: Env): void {

  // ── FIX BUG-05: handler حقيقي بدل السكوت ─────────────────
  bot.callbackQuery('admin_payroll', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const month = getCurrentMonth(env.TIMEZONE);

    const kb = new InlineKeyboard()
      .text(`📊 إصدار رواتب ${month}`, `admin_payroll_issue_${month}`).row()
      .text('🔙 رجوع', 'admin_panel');

    await ctx.editMessageText(
      `📊 *إصدار الرواتب*\n\nالشهر الحالي: *${month}*\n\nسيتم حساب:\n• خصم دقائق التأخير\n• خصم السلف المعتمدة\n\nاضغط للمعاينة والإصدار:`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  // ── إصدار الرواتب الفعلي ──────────────────────────────────
  bot.callbackQuery(/^admin_payroll_issue_\d{4}-\d{2}$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const month = ctx.callbackQuery.data.replace('admin_payroll_issue_', '');
    const settings = await getSettings(env);
    const deductionPerMin = parseFloat(settings['late_deduction_per_minute'] ?? '0');

    const employees = await getAllEmployees(env);
    let issuedCount = 0;
    let skippedCount = 0;
    let summary = '';

    for (const employee of employees) {
      // تخطي من صدر له راتب هذا الشهر
      if (await hasPayrollForMonth(env, employee.id, month)) {
        skippedCount++;
        continue;
      }

      const lateMinutes   = await getTotalLateMinutes(env, employee.id, month);
      const lateDeduction = lateMinutes * deductionPerMin;
      const activeLoan    = await getTotalActiveLoan(env, employee.id);
      const totalDed      = lateDeduction + activeLoan;
      const netSalary     = employee.base_salary - totalDed;

      await issuePayroll(env, employee.id, month, employee.base_salary, totalDed, netSalary);

      // إشعار الموظف براتبه
      try {
        await bot.api.sendMessage(
          employee.telegram_id,
          `💰 *تم إصدار راتبك — ${month}*\n\n` +
          `📌 الأساسي: ${employee.base_salary.toFixed(2)} ريال\n` +
          (totalDed > 0 ? `➖ الخصومات: ${totalDed.toFixed(2)} ريال\n` : '') +
          `\n💵 *الصافي: ${netSalary.toFixed(2)} ريال*`,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}

      summary += `• ${employee.full_name}: ${netSalary.toFixed(2)} ريال\n`;
      issuedCount++;
    }

    const resultMsg =
      `✅ *اكتمل إصدار رواتب ${month}*\n\n` +
      `صدر: ${issuedCount} موظف\n` +
      `تخطّى (مُصدر مسبقاً): ${skippedCount}\n` +
      (summary ? `\n📋 *التفاصيل:*\n${summary}` : '');

    await ctx.editMessageText(resultMsg, {
      parse_mode: 'Markdown',
      reply_markup: getAdminMenu(),
    });
    await ctx.answerCallbackQuery();
  });
}
