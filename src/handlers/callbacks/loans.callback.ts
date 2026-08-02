// ============================================================
// src/handlers/callbacks/loans.callback.ts — Loan System
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId, getEmployeeById } from '../../db/employees.db';
import {
  updateLoanStatus,
  getLoanById,
  hasPendingLoan,
  getTotalActiveLoan,
} from '../../db/loans.db';
import { setState } from '../../db/state.db';
import { getMainMenu } from '../../keyboards/main.keyboards';

export function registerLoanCallbacks(bot: Bot, env: Env): void {

  // ── بدء طلب السلفة ────────────────────────────────────────
  bot.callbackQuery('action_loan', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    if (await hasPendingLoan(env, emp.id)) {
      await ctx.editMessageText(
        '⚠️ لديك طلب سلفة قيد الانتظار بالفعل.\nانتظر رد الإدارة.',
        { reply_markup: getMainMenu(emp.role === 'admin') }
      );
      return ctx.answerCallbackQuery();
    }

    const activeLoan = await getTotalActiveLoan(env, emp.id);
    const activeLoanMsg = activeLoan > 0
      ? `📊 سلفتك النشطة الحالية: *${activeLoan}* ريال\n\n`
      : '';

    await setState(env, tid, 'awaiting_loan_amount', { activeLoan });

    await ctx.editMessageText(
      `💸 *طلب سلفة*\n\n${activeLoanMsg}أرسل *المبلغ* المطلوب بالأرقام فقط:\nمثال: 500`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });

  // ── موافقة / رفض السلفة (أدمن) ───────────────────────────
  bot.callbackQuery(/^(approve|reject)_loan_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const parts = ctx.callbackQuery.data.split('_');
    const isApprove = parts[0] === 'approve';
    const loanId = parseInt(parts[2]);

    const loan = await getLoanById(env, loanId);
    if (!loan) return ctx.answerCallbackQuery('الطلب غير موجود!');
    if (loan.status !== 'pending') {
      return ctx.answerCallbackQuery('تمت معالجة هذا الطلب مسبقاً!');
    }

    const newStatus = isApprove ? 'approved' : 'rejected';
    await updateLoanStatus(env, loanId, newStatus);

    // إشعار الموظف
    const employee = await getEmployeeById(env, loan.employee_id);
    if (employee) {
      const notif = isApprove
        ? `✅ *تمت الموافقة على سلفتك*\nالمبلغ: *${loan.amount}* ريال\nالسبب: ${loan.reason}`
        : `❌ *تم رفض طلب سلفتك*\nالمبلغ: ${loan.amount} ريال\nيرجى التواصل مع الإدارة.`;
      try {
        await bot.api.sendMessage(employee.telegram_id, notif, { parse_mode: 'Markdown' });
      } catch (_) {}
    }

    await ctx.editMessageText(
      `${isApprove ? '✅ موافقة' : '❌ رفض'} سلفة *${employee?.full_name ?? 'الموظف'}*\nالمبلغ: ${loan.amount} ريال`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });
}
