// ============================================================
// src/handlers/callbacks/admin/employees.callback.ts
// إدارة الموظفين: قائمة | عرض | حذف ناعم | تعديل راتب | إضافة
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId, getAllEmployees, softDeleteEmployee } from '../../../db/employees.db';
import { setState } from '../../../db/state.db';
import { getEmployeeManagementMenu, getAdminMenu } from '../../../keyboards/main.keyboards';

export function registerAdminEmployeeCallbacks(bot: Bot, env: Env): void {

  // ── قائمة إدارة الموظفين ──────────────────────────────────
  bot.callbackQuery('admin_employees', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await ctx.editMessageText('👥 *إدارة الموظفين*', {
      parse_mode: 'Markdown',
      reply_markup: getEmployeeManagementMenu(),
    });
    await ctx.answerCallbackQuery();
  });

  // ── عرض قائمة الموظفين ────────────────────────────────────
  bot.callbackQuery('admin_emp_list', async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const employees = await getAllEmployees(env);

    if (employees.length === 0) {
      await ctx.editMessageText('لا يوجد موظفون مسجلون.', {
        reply_markup: getEmployeeManagementMenu(),
      });
      return ctx.answerCallbackQuery();
    }

    const kb = new InlineKeyboard();
    for (const e of employees) {
      const icon = e.role === 'admin' ? '👑' : '👤';
      kb.text(`${icon} ${e.full_name}`, `admin_emp_view_${e.id}`).row();
    }
    kb.text('🔙 رجوع', 'admin_employees');

    await ctx.editMessageText(
      `📋 *قائمة الموظفين* (${employees.length})`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  // ── تفاصيل موظف ───────────────────────────────────────────
  bot.callbackQuery(/^admin_emp_view_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const employee = await env.DB.prepare('SELECT * FROM Employees WHERE id = ?')
      .bind(empId).first() as any;

    if (!employee) return ctx.answerCallbackQuery('الموظف غير موجود!');

    const kb = new InlineKeyboard()
      .text('💰 تعديل الراتب',   `admin_emp_salary_${empId}`).row()
      .text('🗑️ حذف الموظف',    `admin_emp_delete_${empId}`).row()
      .text('🔙 رجوع للقائمة',  'admin_emp_list');

    const text =
      `👤 *بيانات الموظف*\n\n` +
      `الاسم: ${employee.full_name}\n` +
      `الدور: ${employee.role === 'admin' ? '👑 مدير' : '👤 موظف'}\n` +
      `الراتب: ${employee.base_salary} ريال\n` +
      `Telegram ID: \`${employee.telegram_id}\`\n` +
      `الحالة: ${employee.is_active ? '✅ نشط' : '🚫 محذوف'}\n` +
      `مسجل منذ: ${employee.created_at}`;

    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
    await ctx.answerCallbackQuery();
  });

  // ── تأكيد الحذف ───────────────────────────────────────────
  bot.callbackQuery(/^admin_emp_delete_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    if (empId === admin.id) return ctx.answerCallbackQuery('لا يمكنك حذف حسابك الخاص!');

    const employee = await env.DB.prepare('SELECT full_name FROM Employees WHERE id = ?')
      .bind(empId).first() as any;

    const kb = new InlineKeyboard()
      .text('✅ نعم، احذفه', `admin_emp_delete_confirm_${empId}`)
      .text('❌ إلغاء',      `admin_emp_view_${empId}`);

    await ctx.editMessageText(
      `⚠️ *تأكيد الحذف*\n\nهل تريد حذف الموظف:\n*${employee?.full_name ?? ''}*؟\n\n_(الحذف ناعم — البيانات التاريخية محفوظة)_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  // ── تنفيذ الحذف الناعم ────────────────────────────────────
  bot.callbackQuery(/^admin_emp_delete_confirm_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const employee = await env.DB.prepare('SELECT full_name FROM Employees WHERE id = ?')
      .bind(empId).first() as any;

    await softDeleteEmployee(env, empId);

    await ctx.editMessageText(
      `✅ تم حذف الموظف *"${employee?.full_name ?? ''}"* بنجاح.`,
      { parse_mode: 'Markdown', reply_markup: getEmployeeManagementMenu() }
    );
    await ctx.answerCallbackQuery();
  });

  // ── بدء تعديل الراتب ──────────────────────────────────────
  bot.callbackQuery(/^admin_emp_salary_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const employee = await env.DB.prepare('SELECT full_name, base_salary FROM Employees WHERE id = ?')
      .bind(empId).first() as any;

    if (!employee) return ctx.answerCallbackQuery('الموظف غير موجود!');

    await setState(env, tid, 'admin_awaiting_salary_update', { empId });
    await ctx.editMessageText(
      `💰 *تعديل راتب: ${employee.full_name}*\n\nالراتب الحالي: ${employee.base_salary} ريال\n\nأرسل الراتب الجديد بالأرقام:\nمثال: 3500`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });

  // ── بدء إضافة موظف جديد ───────────────────────────────────
  bot.callbackQuery('admin_emp_add', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_emp_telegram_id');
    await ctx.editMessageText(
      '➕ *إضافة موظف جديد*\n\n*الخطوة 1/3* — أرسل الـ Telegram ID للموظف:\n_(الموظف يعرف ID الخاص به من @userinfobot)_',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });
}
