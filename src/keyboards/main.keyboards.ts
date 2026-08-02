// ============================================================
// src/keyboards/main.keyboards.ts — Main & Admin Menus
// ============================================================
import { InlineKeyboard } from 'grammy';

/** القائمة الرئيسية للموظف */
export function getMainMenu(isAdmin: boolean): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('✅ تسجيل الحضور',  'action_checkin')
    .text('❌ تسجيل الانصراف', 'action_checkout').row()
    .text('🏖️ طلب إجازة',     'action_leave')
    .text('💸 طلب سلفة',      'action_loan').row()
    .text('📋 سجل الحضور',    'action_history')
    .text('💰 راتبي',          'action_salary').row()
    .text('🏷️ إجازاتي',       'action_leaves');

  if (isAdmin) {
    kb.row().text('⚙️ لوحة الإدارة', 'admin_panel');
  }
  return kb;
}

/** لوحة إدارة الأدمن */
export function getAdminMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👥 إدارة الموظفين',  'admin_employees').row()
    .text('📢 إرسال تعميم',     'admin_broadcast')
    .text('📊 إصدار الرواتب',   'admin_payroll').row()
    .text('📈 تقرير اليوم',     'admin_report_today')
    .text('⚙️ إعدادات الدوام', 'admin_settings').row()
    .text('🔙 رجوع',            'back_to_main');
}

/** قائمة إدارة الموظفين */
export function getEmployeeManagementMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ إضافة موظف',    'admin_emp_add').row()
    .text('📋 قائمة الموظفين', 'admin_emp_list').row()
    .text('🔙 رجوع للإدارة',  'admin_panel');
}
