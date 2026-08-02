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
import { getTotalActiveLoan, markEmployeeLoansAsPaid } from '../../../db/loans.db';
import { getSettings } from '../../../db/settings.db';
import { getAdminMenu } from '../../../keyboards/main.keyboards';
import { getCurrentMonth, getDaysInMonth, calcLateMinutes } from '../../../utils/time';
import { escapeMarkdown } from '../../../utils/markdown';

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
    
    const startTime = settings['work_start_time'] ?? '09:00';
    const endTime = settings['work_end_time'] ?? '17:00';
    
    // إجمالي دقائق العمل في اليوم
    const workMinutes = calcLateMinutes(endTime, startTime) || 480; // 8 hours default if 0
    
    const daysInMonth = getDaysInMonth(month);

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

      // الحساب الديناميكي للراتب
      const baseSalary = employee.base_salary;
      const dailyRate = baseSalary / 30; // بناء على شهر 30 يوم قياسي
      const dynamicMonthSalary = dailyRate * daysInMonth; // 28, 30, or 31 days
      const minuteRate = dailyRate / workMinutes; // أجر الدقيقة

      const lateMinutes   = await getTotalLateMinutes(env, employee.id, month);
      const lateDeduction = lateMinutes * minuteRate;
      const activeLoan    = await getTotalActiveLoan(env, employee.id);
      
      const totalDed      = lateDeduction + activeLoan;
      const netSalary     = Math.max(0, dynamicMonthSalary - totalDed);

      await issuePayroll(env, employee.id, month, dynamicMonthSalary, totalDed, netSalary);
      
      // تحويل السلف إلى مدفوعة لكي لا تخصم مرة أخرى
      if (activeLoan > 0) {
        await markEmployeeLoansAsPaid(env, employee.id);
      }

      // إشعار الموظف براتبه
      try {
        await bot.api.sendMessage(
          employee.telegram_id,
          `💰 *تم إصدار راتبك — ${month}*\n\n` +
          `📌 الأساسي المستحق (${daysInMonth} يوم): ${dynamicMonthSalary.toFixed(2)} جنيه\n` +
          (totalDed > 0 ? `➖ الخصومات: ${totalDed.toFixed(2)} جنيه\n` : '') +
          `\n💵 *الصافي: ${netSalary.toFixed(2)} جنيه*`,
          { parse_mode: 'Markdown' }
        );
      } catch (_) {}

      // Sleep for 50ms to prevent Telegram rate limit (Too Many Requests)
      await new Promise(r => setTimeout(r, 50));

      summary += `• ${escapeMarkdown(employee.full_name)}: ${netSalary.toFixed(2)} جنيه\n`;
      issuedCount++;
    }

    const headerMsg =
      `✅ *اكتمل إصدار رواتب ${month}*\n\n` +
      `صدر: ${issuedCount} موظف\n` +
      `تخطّى (مُصدر مسبقاً): ${skippedCount}\n` +
      (summary ? `\n📋 *التفاصيل:*\n` : '');

    await ctx.editMessageText(headerMsg, {
      parse_mode: 'Markdown',
      reply_markup: summary ? undefined : getAdminMenu(),
    });

    if (summary) {
      // تقسيم النص الطويل لتجنب تجاوز حد 4096 حرف في تليجرام
      const chunkSize = 3500;
      for (let i = 0; i < summary.length; i += chunkSize) {
        const chunk = summary.substring(i, i + chunkSize);
        const isLast = (i + chunkSize >= summary.length);
        await bot.api.sendMessage(tid, chunk, {
          parse_mode: 'Markdown',
          reply_markup: isLast ? getAdminMenu() : undefined
        });
      }
    }
    
    await ctx.answerCallbackQuery();
  });
}
