import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId } from '../../db/employees.db';
import { getEmployeePayroll } from '../../db/payroll.db';
import { getTotalActiveLoan } from '../../db/loans.db';
import { getSettings } from '../../db/settings.db';
import { getTotalLateMinutes } from '../../db/attendance.db';
import { getMainMenu } from '../../keyboards/main.keyboards';
import { getCurrentMonth, getDaysInMonth, calcLateMinutes, diffMinutes } from '../../utils/time';
import { InlineKeyboard } from 'grammy';
import { calculatePayroll } from '../../utils/payroll';

export function registerSalaryCallbacks(bot: Bot, env: Env): void {
  bot.callbackQuery('action_salary', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const month = getCurrentMonth(env.TIMEZONE);
    const settings = await getSettings(env);

    const startTime = settings['work_start_time'] ?? '09:00';
    const endTime   = settings['work_end_time'] ?? '17:00';
    const workMinutes = diffMinutes(endTime, startTime) || 480;
    
    const deductionMultiplier = parseFloat(settings['late_deduction_per_minute'] ?? '1');
    const bonusMultiplier = parseFloat(settings['overtime_bonus_per_minute'] ?? '1');

    const lateMinutes = await getTotalLateMinutes(env, emp.id, month);
    const [yearStr, monthStr] = month.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
    const otRes = await env.DB.prepare("SELECT SUM(overtime_minutes) as ot FROM Attendance WHERE employee_id = ? AND date >= ? AND date <= ?").bind(emp.id, `${month}-01`, `${month}-${daysInMonth}`).first();
    const overtimeMinutes = (otRes as any)?.ot || 0;
    const activeLoan = await getTotalActiveLoan(env, emp.id);

    const payroll = calculatePayroll({
      base_salary: emp.base_salary,
      workMinutes,
      lateMinutes,
      overtimeMinutes,
      activeLoan,
      daysInMonth,
      deductionMultiplier,
      bonusMultiplier
    });

    const history = await getEmployeePayroll(env, emp.id);

    let text = `💰 *تفاصيل راتب شهر ${month}*\n\n`;
    text += `📌 الراتب الأساسي (30ي):    ${emp.base_salary.toFixed(2)} جنيه\n`;

    if (payroll.lateDeduction > 0) {
      text += `➖ خصم التأخير:      ${payroll.lateDeduction.toFixed(2)} جنيه\n`;
    }
    if (payroll.overtimeBonus > 0) {
      text += `➕ إضافي:            ${payroll.overtimeBonus.toFixed(2)} جنيه\n`;
    }
    if (activeLoan > 0) {
      text += `➖ سلفة نشطة:        ${activeLoan.toFixed(2)} جنيه\n`;
    }
    text += `\n💵 *الصافي المتوقع: ${payroll.netSalary.toFixed(2)} جنيه*\n`;

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

  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    


    if (data.startsWith('confirm_payroll_')) {
      const parts = data.split('_');
      if (parts.length < 4) return next();
      const targetEmpId = parseInt(parts[2]);
      const month = parts.slice(3).join('_');
      
      const tid = String(ctx.from?.id);
      const emp = await getEmployeeByTelegramId(env, tid);
      
      if (!emp) {
        try { await ctx.answerCallbackQuery('أنت غير مسجل!'); } catch (_) {}
        return;
      }
      
      if (emp.id !== targetEmpId) {
        try { await ctx.answerCallbackQuery('هذا الراتب لا يخصك!', { show_alert: true }); } catch (_) {}
        return;
      }



      try {
        const record = await env.DB.prepare(
          "SELECT is_confirmed FROM Payroll WHERE employee_id = ? AND month = ?"
        ).bind(emp.id, month).first();

        if (!record) {
          try { await ctx.answerCallbackQuery('لم يتم العثور على سجل راتب لهذا الشهر.'); } catch (_) {}
          return;
        }

        if (record.is_confirmed) {
          try { await ctx.answerCallbackQuery('لقد قمت بتأكيد استلام هذا الراتب مسبقاً! ✅', { show_alert: true }); } catch (_) {}
          return;
        }

        try { await ctx.answerCallbackQuery('تم تأكيد الاستلام بنجاح! ✅', { show_alert: true }); } catch (_) {}

        await env.DB.prepare(
          "UPDATE Payroll SET is_confirmed = 1, confirmed_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND month = ?"
        ).bind(emp.id, month).run();

        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        await ctx.reply(`✅ تم تأكيد استلام راتبك لشهر ${month} بنجاح. شكراً لك!`);
      } catch (e: any) {
        console.error(e);
        await env.DB.prepare("INSERT INTO AuditLogs (admin_id, action, details) VALUES (0, 'SALARY_CONFIRM_ERROR', ?)").bind(String(e.stack || e.message).substring(0, 500)).run().catch(() => {});
        try {
          await ctx.answerCallbackQuery('حدث خطأ أثناء التأكيد.', { show_alert: true });
        } catch (inner) {}
      }
      return; // Handled
    }
    
    return next(); // pass to other handlers if it's not confirm_payroll
  });

}
