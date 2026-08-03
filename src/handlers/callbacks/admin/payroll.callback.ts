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
import { logAction } from '../../../db/audit.db';
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
    
    const { getHolidaysInMonth } = await import('../../../db/holidays.db');
    const { isWeekend } = await import('../../../utils/time');
    const holidays = await getHolidaysInMonth(env, month);
    const holidayDates = new Set(holidays.map((h: any) => h.holiday_date));
    
    let workingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${month}-${i.toString().padStart(2, '0')}`;
      if (!isWeekend(dStr) && !holidayDates.has(dStr)) {
        workingDays++;
      }
    }
    workingDays = workingDays > 0 ? workingDays : 1;

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

      // الحساب بناء على الراتب الأساسي الثابت
      const baseSalary = employee.base_salary;
      const dailyRate = baseSalary / workingDays; // بناء على أيام العمل الفعلية
      const minuteRate = dailyRate / workMinutes; // أجر الدقيقة للخصم

      const lateMinutes   = await getTotalLateMinutes(env, employee.id, month);
      let lateDeduction = lateMinutes * minuteRate;
      
      // Ensure lateDeduction does not exceed baseSalary
      lateDeduction = Math.min(lateDeduction, baseSalary);

      const originalLoan  = await getTotalActiveLoan(env, employee.id);
      
      let activeLoan = originalLoan;
      let netSalary = baseSalary - lateDeduction - activeLoan;
      let remainingLoan = 0;

      if (netSalary < 0) {
        // إذا كان الصافي بالسالب، نخصم السلفة بمقدار الراتب المتاح فقط
        const maxLoanDeduction = Math.max(0, baseSalary - lateDeduction);
        activeLoan = maxLoanDeduction;
        remainingLoan = originalLoan - activeLoan;
        netSalary = 0;
      }

      const totalDed = lateDeduction + activeLoan;
      await issuePayroll(env, employee.id, month, baseSalary, totalDed, netSalary);
      
      if (originalLoan > 0) {
        await markEmployeeLoansAsPaid(env, employee.id);
        // ترحيل السلفة المتبقية إن وجدت كعنصر جديد معتمد
        if (remainingLoan > 0) {
          await env.DB.prepare("INSERT INTO Loans (employee_id, amount, reason, status) VALUES (?, ?, 'باقي سلفة سابقة مرحلة', 'approved')").bind(employee.id, remainingLoan).run();
        }
      }

      // إشعار الموظف براتبه
      try {
        await bot.api.sendMessage(
          employee.telegram_id,
          `💰 *تم إصدار راتبك — ${month}*\n\n` +
          `📌 الأساسي المستحق: ${baseSalary.toFixed(2)} جنيه\n` +
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

    await logAction(env, admin.id, 'ISSUE_PAYROLL', `تم إصدار رواتب شهر ${month} لـ ${issuedCount} موظفين`);

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
        
        const undoKb = isLast ? new InlineKeyboard().text('🔄 تراجع عن إصدار الرواتب', `admin_payroll_undo_${month}`).row().text('🔙 رجوع', 'admin_panel') : undefined;

        await bot.api.sendMessage(tid, chunk, {
          parse_mode: 'Markdown',
          reply_markup: undoKb
        });
      }
    } else {
      await ctx.editMessageText(headerMsg, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 رجوع', 'admin_panel'),
      });
    }
    
    await ctx.answerCallbackQuery();
  });

  // ── تراجع عن إصدار رواتب الشهر (تأكيد) ───────────────────
  bot.callbackQuery(/^admin_payroll_undo_\d{4}-\d{2}$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const month = ctx.callbackQuery.data.replace('admin_payroll_undo_', '');
    
    const kb = new InlineKeyboard()
      .text('✅ نعم، امسح كل رواتب الشهر', `confirm_admin_payroll_undo_${month}`).row()
      .text('❌ لا، تراجع', 'admin_panel');

    await ctx.editMessageText(
      `⚠️ *تأكيد مسح رواتب ${month}*\n\nهل أنت متأكد من مسح **جميع** الرواتب المصدرة لهذا الشهر والتراجع عنها؟\nهذا سيعيد السلف المدفوعة لحالتها المعتمدة ويمسح السلف المرحلة.`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  // ── التأكيد الفعلي ─────────────────────────────────────────
  bot.callbackQuery(/^confirm_admin_payroll_undo_\d{4}-\d{2}$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const month = ctx.callbackQuery.data.replace('confirm_admin_payroll_undo_', '');
    
    // إرجاع حالة السلف
    await env.DB.prepare("DELETE FROM Loans WHERE reason = 'باقي سلفة سابقة مرحلة' AND status = 'approved'").run();
    await env.DB.prepare("UPDATE Loans SET status = 'approved' WHERE status = 'paid'").run();
    
    await env.DB.prepare("DELETE FROM Payroll WHERE month = ?").bind(month).run();
    await logAction(env, admin.id, 'UNDO_PAYROLL', `تم إلغاء إصدار رواتب شهر ${month}`);

    await ctx.editMessageText(`✅ تم التراجع عن إصدار رواتب شهر ${month} بنجاح.`, {
      parse_mode: 'Markdown',
      reply_markup: getAdminMenu(),
    });
    await ctx.answerCallbackQuery();
  });
}
