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

    const pendingLoans = await env.DB.prepare(
      "SELECT id, amount, created_at FROM Loans WHERE employee_id = ? AND status = 'pending'"
    ).bind(emp.id).all();

    const kb = new InlineKeyboard();

    if (pendingLoans.results.length > 0) {
      text += `\n⏳ *طلبات سلف قيد الانتظار:*\n`;
      for (const pl of pendingLoans.results as any[]) {
        text += `• مبلغ ${pl.amount} جنيه (${pl.created_at})\n`;
        kb.text(`🗑️ إلغاء السلفة (${pl.amount}ج)`, `cancel_my_loan_${pl.id}`).row();
      }
    }

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

  bot.callbackQuery(/^cancel_my_loan_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const loanId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const loan = await env.DB.prepare("SELECT * FROM Loans WHERE id = ?").bind(loanId).first() as any;

    if (!loan || loan.employee_id !== emp.id) {
      return ctx.answerCallbackQuery('الطلب غير موجود أو لا تملكه!');
    }
    if (loan.status !== 'pending') {
      return ctx.answerCallbackQuery('لا يمكن إلغاء الطلب لأنه تمت معالجته بالفعل.');
    }

    await env.DB.prepare("DELETE FROM Loans WHERE id = ?").bind(loanId).run();
    
    await ctx.editMessageText(`✅ تم سحب/إلغاء طلب السلفة بمبلغ (${loan.amount} جنيه) بنجاح.`, {
      reply_markup: getMainMenu(emp.role === 'admin')
    });
    await ctx.answerCallbackQuery();
  });
}
