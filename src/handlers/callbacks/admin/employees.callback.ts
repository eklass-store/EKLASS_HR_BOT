// ============================================================
// src/handlers/callbacks/admin/employees.callback.ts
// إدارة الموظفين: قائمة | عرض | حذف ناعم | تعديل راتب | إضافة
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId, getAllEmployees, softDeleteEmployee, getEmployeeById, updateEmployeeRole } from '../../../db/employees.db';
import { setState } from '../../../db/state.db';
import { getEmployeeManagementMenu, getAdminMenu } from '../../../keyboards/main.keyboards';
import { escapeMarkdown } from '../../../utils/markdown';
import { logAction } from '../../../db/audit.db';

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

  // ── عرض قائمة الموظفين (مع الترقيم) ──────────────────────
  bot.callbackQuery(/^admin_emp_list(_\d+)?$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const match = ctx.callbackQuery.data.match(/^admin_emp_list_(\d+)$/);
    const page = match ? parseInt(match[1]) : 1;
    const limit = 10;
    
    const employees = await getAllEmployees(env);

    if (employees.length === 0) {
      await ctx.editMessageText(
        '📭 لا يوجد موظفون مسجلون حالياً.',
        { reply_markup: getEmployeeManagementMenu() }
      );
      return ctx.answerCallbackQuery();
    }

    const totalPages = Math.ceil(employees.length / limit);
    const startIndex = (page - 1) * limit;
    const currentEmployees = employees.slice(startIndex, startIndex + limit);

    const kb = new InlineKeyboard();
    for (const e of currentEmployees) {
      const icon = e.role === 'admin' ? '👑' : '👤';
      kb.text(`${icon} ${e.full_name}`, `admin_emp_view_${e.id}`).row();
    }
    
    // Pagination Controls
    if (totalPages > 1) {
      if (page > 1) kb.text('⬅️ السابق', `admin_emp_list_${page - 1}`);
      kb.text(`📄 ${page}/${totalPages}`, 'dummy_btn');
      if (page < totalPages) kb.text('التالي ➡️', `admin_emp_list_${page + 1}`);
      kb.row();
    }
    
    kb.text('🔙 رجوع', 'admin_employees');

    await ctx.editMessageText(
      `📋 *قائمة الموظفين* (${employees.length})`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('dummy_btn', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // ── تفاصيل موظف ───────────────────────────────────────────
  bot.callbackQuery(/^admin_emp_view_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const employee = await getEmployeeById(env, empId);

    if (!employee) return ctx.answerCallbackQuery('الموظف غير موجود!');

    const kb = new InlineKeyboard()
      .text('💰 تعديل الراتب',   `admin_emp_salary_${empId}`).row()
      .text('🗑️ حذف الموظف',    `admin_emp_delete_${empId}`).row();
      
    if (employee.role !== 'admin') {
      kb.text('👑 ترقية لمدير', `admin_emp_promote_${empId}`).row();
    } else if (empId !== admin.id) {
      kb.text('⏬ إلغاء الترقية (إرجاع لموظف)', `admin_emp_demote_${empId}`).row();
    }
    
    kb.text('🔙 رجوع للقائمة',  'admin_emp_list');

    const text =
      `👤 *بيانات الموظف*\n\n` +
      `الاسم: ${escapeMarkdown(employee.full_name)}\n` +
      `المسمى الوظيفي: ${escapeMarkdown(employee.department || 'غير محدد')}\n` +
      `الدور: ${employee.role === 'admin' ? '👑 مدير' : '👤 موظف'}\n` +
      `الراتب: ${employee.base_salary} جنيه\n` +
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

    const employee = await getEmployeeById(env, empId);

    const kb = new InlineKeyboard()
      .text('✅ نعم، احذفه', `admin_emp_delete_confirm_${empId}`)
      .text('❌ إلغاء',      `admin_emp_view_${empId}`);

    await ctx.editMessageText(
      `⚠️ *تأكيد الحذف*\n\nهل تريد حذف الموظف:\n*${escapeMarkdown(employee?.full_name ?? '')}*؟\n\n_(الحذف ناعم — البيانات التاريخية محفوظة)_`,
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
    const employee = await getEmployeeById(env, empId);

    await softDeleteEmployee(env, empId);
    await logAction(env, admin.id, 'DELETE_EMPLOYEE', `تم حذف الموظف ID ${empId} (${employee?.full_name})`);

    await ctx.editMessageText(
      `✅ تم حذف الموظف *"${escapeMarkdown(employee?.full_name ?? '')}"* بنجاح.`,
      { parse_mode: 'Markdown', reply_markup: getEmployeeManagementMenu() }
    );
    await ctx.answerCallbackQuery();
  });

  // ── ترقية الموظف لمدير ────────────────────────────────────
  bot.callbackQuery(/^admin_emp_promote_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const employee = await getEmployeeById(env, empId);
    if (!employee) return ctx.answerCallbackQuery('الموظف غير موجود!');
    if (employee.role !== "employee") return ctx.answerCallbackQuery('لا يمكن ترقية هذا الموظف (قد يكون مديراً بالفعل)!');

    await updateEmployeeRole(env, empId, 'admin');
    await logAction(env, admin.id, 'PROMOTE_ADMIN', `تمت ترقية الموظف ID ${empId} (${employee?.full_name}) إلى مدير`);

    await ctx.editMessageText(
      `✅ تمت ترقية *${escapeMarkdown(employee.full_name)}* إلى رتبة مدير بنجاح.`,
      { parse_mode: 'Markdown', reply_markup: getEmployeeManagementMenu() }
    );
    await ctx.answerCallbackQuery();
  });

  // ── إلغاء ترقية المدير ────────────────────────────────────
  bot.callbackQuery(/^admin_emp_demote_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const empId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    if (empId === admin.id) return ctx.answerCallbackQuery('لا يمكنك إلغاء ترقية حسابك الخاص!');

    const employee = await getEmployeeById(env, empId);
    if (!employee) return ctx.answerCallbackQuery('الموظف غير موجود!');
    if (employee.role !== "admin") return ctx.answerCallbackQuery('لا يمكن إلغاء ترقية هذا الموظف (قد يكون موظفاً بالفعل)!');

    await updateEmployeeRole(env, empId, 'employee');
    await logAction(env, admin.id, 'DEMOTE_ADMIN', `تم إلغاء ترقية المدير ID ${empId} (${employee?.full_name}) وإرجاعه لموظف`);

    await ctx.editMessageText(
      `✅ تم سحب الصلاحيات من *${escapeMarkdown(employee.full_name)}* وإرجاعه لرتبة موظف بنجاح.`,
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
    const employee = await getEmployeeById(env, empId);

    if (!employee) return ctx.answerCallbackQuery('الموظف غير موجود!');

    await setState(env, tid, 'admin_awaiting_salary_update', { empId });
    await ctx.editMessageText(
      `💰 *تعديل راتب: ${escapeMarkdown(employee.full_name)}*\n\nالراتب الحالي: ${employee.base_salary} جنيه\n\nأرسل الراتب الجديد بالأرقام:\nمثال: 3500`,
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

  bot.callbackQuery('admin_emp_search', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_emp_search');
    await ctx.editMessageText(
      '🔍 *البحث عن موظف*\n\nأرسل اسم الموظف (أو جزء منه) للبحث عنه:\n_(أرسل /cancel للإلغاء)_',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });
}
