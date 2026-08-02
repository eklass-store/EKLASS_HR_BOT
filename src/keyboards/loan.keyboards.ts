// ============================================================
// src/keyboards/loan.keyboards.ts — Loan Request Keyboards
// ============================================================
import { InlineKeyboard } from 'grammy';

/** أزرار موافقة/رفض السلفة (للأدمن) */
export function getLoanApprovalKeyboard(loanId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ موافقة', `approve_loan_${loanId}`)
    .text('❌ رفض',    `reject_loan_${loanId}`);
}
