// ============================================================
// src/handlers/callbacks/loans.callback.ts — Loan System
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
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
import { escapeMarkdown } from '../../utils/markdown';
import { logAction } from '../../db/audit.db';

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
      ? `📊 سلفتك النشطة الحالية: *${activeLoan.toFixed(2)}* جنيه\n\n`
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
    if (loan.employee_id === admin.id) {
      return ctx.answerCallbackQuery('لا يمكنك الموافقة على طلبك الشخصي!', { show_alert: true });
    }
    if (loan.status !== 'pending') {
      return ctx.answerCallbackQuery('تمت معالجة هذا الطلب مسبقاً!');
    }

    const newStatus = isApprove ? 'approved' : 'rejected';
    await updateLoanStatus(env, loanId, newStatus, admin.id);
    await logAction(env, admin.id, isApprove ? 'APPROVE_LOAN' : 'REJECT_LOAN', `تم ${isApprove ? 'قبول' : 'رفض'} سلفة ID ${loanId} للموظف ID ${loan.employee_id} بمبلغ ${loan.amount}`);

    // إشعار الموظف
    const employee = await getEmployeeById(env, loan.employee_id);
    if (employee) {
      const notif = isApprove
        ? `✅ *تمت الموافقة على سلفتك*\nالمبلغ: *${loan.amount.toFixed(2)}* جنيه\nالسبب: ${escapeMarkdown(loan.reason)}`
        : `❌ *تم رفض طلب سلفتك*\nالمبلغ: ${loan.amount.toFixed(2)} جنيه\nيرجى التواصل مع الإدارة.`;
      try {
        await bot.api.sendMessage(employee.telegram_id, notif, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error(`Failed to send loan notification to ${employee.telegram_id}`, err);
        await logAction(env, admin.id, 'NOTIFICATION_FAILED', `Failed to send loan status to ${employee.telegram_id}`);
      }
    }

    await ctx.editMessageText(
      `${isApprove ? '✅ موافقة' : '❌ رفض'} سلفة *${escapeMarkdown(employee?.full_name ?? 'الموظف')}*\nالمبلغ: ${loan.amount.toFixed(2)} جنيه`,
      { parse_mode: 'Markdown', reply_markup: undefined }
    );
    await ctx.answerCallbackQuery();
  });

  // ── سلفي (My Loans) ──────────────────────────────────────
  bot.callbackQuery('action_loans', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const activeLoan = await getTotalActiveLoan(env, emp.id);
    const pendingLoans = await env.DB.prepare(
      "SELECT id, amount, created_at FROM Loans WHERE employee_id = ? AND status = 'pending'"
    ).bind(emp.id).all();

    let text = `💳 *سلفي*\n\n`;
    text += `📊 سلفة معتمدة ونشطة: *${activeLoan.toFixed(2)}* جنيه\n\n`;

    const kb = new InlineKeyboard();

    if (pendingLoans.results.length > 0) {
      text += `⏳ *طلبات سلف قيد الانتظار:*\n`;
      for (const pl of pendingLoans.results as any[]) {
        text += `• مبلغ ${pl.amount} جنيه (${pl.created_at})\n`;
        kb.text(`🗑️ إلغاء السلفة (${pl.amount}ج)`, `cancel_my_loan_${pl.id}`).row();
      }
    } else {
      text += `لا توجد طلبات سلف قيد الانتظار.`;
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

  // ── طلب إلغاء السلفة (تأكيد) ──────────────────────────────
  bot.callbackQuery(/^cancel_my_loan_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const loanId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const loan = await getLoanById(env, loanId);

    if (!loan || loan.employee_id !== emp.id) {
      return ctx.answerCallbackQuery('الطلب غير موجود أو لا تملكه!');
    }
    if (loan.status !== 'pending') {
      return ctx.answerCallbackQuery('لا يمكن إلغاء الطلب لأنه تمت معالجته بالفعل.');
    }

    const kb = new InlineKeyboard()
      .text('✅ نعم، متأكد', `confirm_cancel_loan_${loanId}`).row()
      .text('❌ لا، تراجع', 'action_loans');

    await ctx.editMessageText(`❓ هل أنت متأكد من إلغاء طلب السلفة بمبلغ (${loan.amount} جنيه)؟`, {
      reply_markup: kb
    });
    await ctx.answerCallbackQuery();
  });

  // ── التأكيد الفعلي للإلغاء ────────────────────────────────
  bot.callbackQuery(/^confirm_cancel_loan_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const loanId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const loan = await getLoanById(env, loanId);

    if (!loan || loan.employee_id !== emp.id || loan.status !== 'pending') {
      return ctx.answerCallbackQuery('عذراً، الطلب غير متاح.');
    }

    await env.DB.prepare("DELETE FROM Loans WHERE id = ?").bind(loanId).run();
    
    await ctx.editMessageText(`✅ تم إلغاء طلب السلفة بمبلغ (${loan.amount} جنيه) بنجاح.`, {
      reply_markup: getMainMenu(emp.role === 'admin')
    });
    await ctx.answerCallbackQuery();
  });
}
