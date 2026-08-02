// ============================================================
// src/keyboards/leave.keyboards.ts — Leave Request Keyboards
// ============================================================
import { InlineKeyboard } from 'grammy';

/** اختيار نوع الإجازة */
export function getLeaveTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📅 إجازة سنوية',  'leave_type_annual').row()
    .text('🤒 إجازة مرضية',  'leave_type_sick').row()
    .text('🚨 إجازة طارئة',  'leave_type_emergency').row()
    .text('🔙 إلغاء',        'cancel_action');
}

/** أزرار موافقة/رفض الإجازة (للأدمن) — FIX BUG-04: ID من last_row_id */
export function getLeaveApprovalKeyboard(leaveId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ موافقة', `approve_leave_${leaveId}`)
    .text('❌ رفض',    `reject_leave_${leaveId}`);
}

export const LEAVE_TYPE_NAMES: Record<string, string> = {
  annual:    'سنوية',
  sick:      'مرضية',
  emergency: 'طارئة',
};
