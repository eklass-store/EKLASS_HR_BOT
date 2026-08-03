// ============================================================
// src/keyboards/main.keyboards.ts — Main & Admin Menus
// ============================================================
import { InlineKeyboard, Keyboard } from 'grammy';

/** القائمة الدائمة أسفل الشاشة (Reply Keyboard) */
export function getPersistentMenu(): Keyboard {
  return new Keyboard()
    .text('🎛️ القائمة الرئيسية')
    .text('🆔 معرف تليجرام').row()
    .text('❓ مساعدة')
    .resized(); // يجعل حجم الأزرار أصغر ومناسباً
}

/** القائمة الرئيسية للموظف */
export function getMainMenu(isAdmin: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('✅ تسجيل الحضور',  'action_checkin')
    .text('🚪 تسجيل الانصراف', 'action_checkout').row()
    .text('🏖️ طلب إجازة',     'action_leave')
    .text('💸 طلب سلفة',      'action_loan').row()
    .text('📋 سجل الحضور',    'action_history')
    .text('💰 راتبي',          'action_salary').row()
    .text('🏷️ إجازاتي',       'action_leaves')
    .text('💳 سلفي',          'action_loans');

  kb.row();
  return kb;
}

