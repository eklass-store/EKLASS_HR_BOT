// ============================================================
// src/keyboards/main.keyboards.ts — Main & Admin Menus
// FIX BUG-E: getMainMenu يُظهر زر لوحة الإدارة للأدمن
// FIX BUG-N: إضافة getAdminMenu التي كانت مفقودة
// ============================================================
import { InlineKeyboard, Keyboard } from 'grammy';

/** القائمة الدائمة أسفل الشاشة (Reply Keyboard) */
export function getPersistentMenu(): Keyboard {
  return new Keyboard()
    .text('🎛️ القائمة الرئيسية')
    .text('🆔 معرف تليجرام').row()
    .text('❓ مساعدة')
    .resized();
}

/** القائمة الرئيسية للموظف — FIX BUG-E: يُظهر لوحة الإدارة إذا كان أدمن */
export function getMainMenu(isAdmin: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('✅ تسجيل الحضور',  'action_checkin')
    .text('🚪 تسجيل الانصراف', 'action_checkout').row()
    .text('🏖️ طلب إجازة',     'action_leave')
    .text('💸 طلب سلفة',      'action_loan').row()
    .text('📋 سجل الحضور',    'action_history')
    .text('💰 راتبي',          'action_salary').row()
    .text('🏷️ إجازاتي',       'action_leaves')
    .text('💳 سلفي',          'action_loans').row();



  return kb;
}

/** لوحة تحكم الأدمن — FIX BUG-N: كانت مفقودة وتُسبب runtime error */
export function getAdminMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👤 إضافة موظف',     'admin_add_employee').row()
    .text('📋 الحضور اليومي',  'admin_daily_report').row()
    .text('⚙️ إعدادات النظام', 'admin_settings').row()
    .text('🎛️ القائمة الرئيسية', 'back_to_main');
}

