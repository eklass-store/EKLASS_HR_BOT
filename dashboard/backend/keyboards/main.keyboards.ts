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

  if (isAdmin) {
    kb.text('⚙️ لوحة الإدارة', 'admin_panel').row();
  } else {
    kb.row();
  }
  return kb;
}

/** لوحة إدارة الأدمن */
export function getAdminMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👥 إدارة الموظفين',  'admin_employees')
    .text('📢 إرسال تعميم',     'admin_broadcast').row()
    .text('📊 إصدار الرواتب',   'admin_payroll')
    .text('📈 تقرير اليوم',     'admin_report_today').row()
    .text('⚙️ إعدادات الدوام', 'admin_settings')
    .text('🔍 سجل التدقيق',    'admin_audit_logs').row()
    .text('🏖️ إدارة العطلات',  'admin_holidays').row()
    .text('🔙 القائمة الرئيسية', 'back_to_main').row();
}

/** قائمة إدارة الموظفين */
export function getEmployeeManagementMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ إضافة موظف',    'admin_emp_add')
    .text('📋 قائمة الموظفين', 'admin_emp_list').row()
    .text('🔍 بحث بالاسم',     'admin_emp_search').row()
    .text('🔙 رجوع للإدارة',  'admin_panel');
}
