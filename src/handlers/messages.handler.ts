// ============================================================
// src/handlers/messages.handler.ts
// معالج الرسائل النصية لجميع المحادثات متعددة الخطوات:
//   - طلب إجازة (نوع → تاريخ بداية → تاريخ نهاية → سبب)
//   - طلب سلفة (مبلغ → سبب)
//   - إضافة موظف (telegram_id → اسم → راتب)
//   - تعديل راتب موظف
//   - تعديل إعدادات الدوام
//   - إرسال تعميم
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../types';
import { getEmployeeByTelegramId, addEmployee } from '../db/employees.db';
import { getState, setState, clearState, parseStateData } from '../db/state.db';
import { createLeave } from '../db/leaves.db';
import { createLoan } from '../db/loans.db';
import { updateSetting } from '../db/settings.db';
import { createAnnouncement } from '../db/announcements.db';
import { getAllEmployees } from '../db/employees.db';
import { getAdmins } from '../db/employees.db';
import { getMainMenu, getAdminMenu, getEmployeeManagementMenu } from '../keyboards/main.keyboards';
import { getLeaveApprovalKeyboard, LEAVE_TYPE_NAMES } from '../keyboards/leave.keyboards';
import { getLoanApprovalKeyboard } from '../keyboards/loan.keyboards';
import { isValidDate, isValidTime, getNow } from '../utils/time';
import { escapeMarkdown } from '../utils/markdown';
import { logAction } from '../db/audit.db';

const SETTING_NAMES: Record<string, string> = {
  work_start_time:           'وقت بداية الدوام',
  work_end_time:             'وقت نهاية الدوام',
  late_deduction_per_minute: 'خصم دقيقة التأخير',
};

export function registerMessageHandler(bot: Bot, env: Env): void {
  bot.on('message:text', async (ctx) => {
    const tid  = String(ctx.from?.id);
    const text = ctx.message.text.trim();

    // تجاهل الأوامر — تعالجها handlers خاصة بها
    if (text.startsWith('/')) return;

    // ── أزرار القائمة الدائمة (Reply Keyboard) ──
    if (text === '🎛️ القائمة الرئيسية') {
      await clearState(env, tid); // إلغاء أي عملية جارية
      const employee = await getEmployeeByTelegramId(env, tid);
      if (!employee) return ctx.reply('أنت غير مسجل في النظام.');
      return ctx.reply('اختر ما تريد من القائمة:', { reply_markup: getMainMenu(employee.role === 'admin') });
    }

    if (text === '🆔 معرف تليجرام') {
      return ctx.reply(`معرفك (Telegram ID) الخاص بك هو:\n\`${tid}\``, { parse_mode: 'Markdown' });
    }

    if (text === '❓ مساعدة') {
      await clearState(env, tid);
      return ctx.reply('هذا البوت مخصص لإدارة الموارد البشرية.\nاستخدم القائمة الرئيسية للوصول إلى كافة الخدمات.\n\nإذا واجهت أي مشكلة، يرجى التواصل مع الإدارة.');
    }

    const stateRecord = await getState(env, tid);
    if (!stateRecord) return; // لا توجد محادثة نشطة

    const state = stateRecord.state;
    const data  = parseStateData(stateRecord);
    const emp   = await getEmployeeByTelegramId(env, tid);

    // ──────────────────────────────────────────────────────────
    // ❶ طلب الإجازة — تاريخ البداية
    // ──────────────────────────────────────────────────────────
    if (state === 'awaiting_leave_start_date') {
      if (!isValidDate(text)) {
        return ctx.reply('⚠️ صيغة التاريخ غير صحيحة.\nاستخدم: YYYY-MM-DD\nمثال: 2024-08-15');
      }
      
      const today = getNow(env.TIMEZONE).date;
      if (text < today) {
        return ctx.reply(`⚠️ لا يمكنك طلب إجازة لتاريخ يسبق اليوم (${today}).`);
      }

      await setState(env, tid, 'awaiting_leave_end_date', { ...data, startDate: text });
      return ctx.reply(
        `✅ تاريخ البداية: *${text}*\n\n*الخطوة 2/3*\n📅 أرسل تاريخ *نهاية* الإجازة:`,
        { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❷ طلب الإجازة — تاريخ النهاية
    // ──────────────────────────────────────────────────────────
    if (state === 'awaiting_leave_end_date') {
      if (!isValidDate(text)) {
        return ctx.reply('⚠️ صيغة التاريخ غير صحيحة. مثال: 2024-08-20');
      }
      const startDate = data['startDate'] as string;
      if (text < startDate) {
        return ctx.reply(`⚠️ تاريخ النهاية يجب أن يكون بعد تاريخ البداية (${startDate})!`);
      }
      await setState(env, tid, 'awaiting_leave_reason', { ...data, endDate: text });
      return ctx.reply(
        `✅ من *${startDate}* إلى *${text}*\n\n*الخطوة 3/3*\n📝 أرسل سبب الإجازة (أو أرسل \`—\` للتخطي):`,
        { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❸ طلب الإجازة — السبب + الإرسال
    // ──────────────────────────────────────────────────────────
    if (state === 'awaiting_leave_reason') {
      if (!emp) { await clearState(env, tid); return; }

      const reason    = text === '—' ? '' : text;
      const startDate = data['startDate'] as string;
      const endDate   = data['endDate']   as string;
      const type      = data['type']      as string;

      const { getLeaveBalance, hasOverlappingLeave } = await import('../db/leaves.db');
      
      if (await hasOverlappingLeave(env, emp.id, startDate, endDate)) {
        await clearState(env, tid);
        return ctx.reply(
          `⚠️ عذراً، التواريخ المطلوبة تتقاطع مع إجازة أخرى لك (معتمدة أو قيد الانتظار).`,
          { reply_markup: getMainMenu(emp.role === 'admin') }
        );
      }

      const balance = await getLeaveBalance(env, emp.id);
      
      const startD = new Date(startDate);
      const endD = new Date(endDate);
      const requestedDays = Math.floor((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (balance.approved + balance.pending + requestedDays > balance.quota) {
        await clearState(env, tid);
        return ctx.reply(
          `⚠️ عذراً، لا يمكنك طلب إجازة لمدة ${requestedDays} يوم.\nرصيدك المتبقي (شاملاً الطلبات المعلقة) هو ${Math.max(0, balance.quota - balance.approved - balance.pending)} يوم فقط.`,
          { reply_markup: getMainMenu(emp.role === 'admin') }
        );
      }

      const leaveId = await createLeave(env, emp.id, startDate, endDate, type, reason);

      // إشعار الأدمن
      const admins = await getAdmins(env);
      const kb     = getLeaveApprovalKeyboard(leaveId);
      for (const admin of admins) {
        try {
          await bot.api.sendMessage(
            admin.telegram_id,
            `📩 *طلب إجازة جديد*\n\nالموظف: ${escapeMarkdown(emp.full_name)}\nالنوع: ${LEAVE_TYPE_NAMES[type] ?? type}\nمن: ${startDate}\nإلى: ${endDate}` +
            (reason ? `\nالسبب: ${escapeMarkdown(reason)}` : ''),
            { parse_mode: 'Markdown', reply_markup: kb }
          );
        } catch (_) {}
      }

      await clearState(env, tid);
      return ctx.reply(
        `✅ تم إرسال طلب الإجازة بنجاح!\n\n📅 من *${startDate}* إلى *${endDate}*\n(${LEAVE_TYPE_NAMES[type] ?? type})\n\nبانتظار موافقة الإدارة ⏳`,
        { parse_mode: 'Markdown', reply_markup: getMainMenu(emp.role === 'admin') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❹ طلب السلفة — المبلغ
    // ──────────────────────────────────────────────────────────
    if (state === 'awaiting_loan_amount') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount <= 0) {
        return ctx.reply('⚠️ يرجى إرسال مبلغ صحيح بالأرقام فقط.\nمثال: 500');
      }

      if (!emp) { await clearState(env, tid); return; }

      const { getSettings } = await import('../db/settings.db');
      const settings = await getSettings(env);
      const maxPercentage = parseFloat(settings['max_loan_percentage'] ?? '50');
      const maxAmount = emp.base_salary * (maxPercentage / 100);

      const activeLoan = (data['activeLoan'] as number) || 0;
      if ((amount + activeLoan) > maxAmount) {
        return ctx.reply(`⚠️ عذراً، إجمالي سلفك تخطى ${maxPercentage}% من راتبك الأساسي.\nالحد الأقصى لك: *${maxAmount.toFixed(2)}* جنيه.\nرصيد سلفك النشطة حالياً: *${activeLoan.toFixed(2)}* جنيه.`, { parse_mode: 'Markdown' });
      }

      await setState(env, tid, 'awaiting_loan_reason', { ...data, amount });
      return ctx.reply(
        `✅ المبلغ: *${amount.toFixed(2)}* جنيه\n\n*الخطوة 2/2*\n📝 أرسل *سبب* طلب السلفة:`,
        { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❺ طلب السلفة — السبب + الإرسال
    // ──────────────────────────────────────────────────────────
    if (state === 'awaiting_loan_reason') {
      if (!emp) { await clearState(env, tid); return; }

      const amount = data['amount'] as number;
      const loanId = await createLoan(env, emp.id, amount, text);

      // إشعار الأدمن
      const admins = await getAdmins(env);
      const kb     = getLoanApprovalKeyboard(loanId);
      for (const admin of admins) {
        try {
          await bot.api.sendMessage(
            admin.telegram_id,
            `💸 *طلب سلفة جديد*\n\nالموظف: ${escapeMarkdown(emp.full_name)}\nالمبلغ: ${amount.toFixed(2)} جنيه\nالسبب: ${escapeMarkdown(text)}`,
            { parse_mode: 'Markdown', reply_markup: kb }
          );
        } catch (_) {}
      }

      await clearState(env, tid);
      return ctx.reply(
        `✅ تم إرسال طلب السلفة بمبلغ *${amount.toFixed(2)}* جنيه\nبانتظار موافقة الإدارة ⏳`,
        { parse_mode: 'Markdown', reply_markup: getMainMenu(emp.role === 'admin') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❻ [ADMIN] إضافة موظف — Telegram ID
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_emp_telegram_id') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      if (!/^\d+$/.test(text)) {
        return ctx.reply('⚠️ الـ Telegram ID يجب أن يكون أرقاماً فقط.\nمثال: 123456789');
      }
      const existing = await getEmployeeByTelegramId(env, text);
      if (existing) {
        return ctx.reply(`⚠️ هذا الـ ID مسجل بالفعل للموظف: *${escapeMarkdown(existing.full_name)}*`, {
          parse_mode: 'Markdown',
        });
      }

      await setState(env, tid, 'admin_awaiting_emp_name', { telegramId: text });
      return ctx.reply(
        `✅ Telegram ID: \`${text}\`\n\n*الخطوة 2/4* — أرسل الاسم الكامل للموظف:`,
        { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❼ [ADMIN] إضافة موظف — الاسم
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_emp_name') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      await setState(env, tid, 'admin_awaiting_emp_department', { ...data, fullName: text });
      return ctx.reply(
        `✅ الاسم: *${escapeMarkdown(text)}*\n\n*الخطوة 3/4* — أرسل المسمى الوظيفي (القسم):\nمثال: محاسب، كاشير، مهندس`,
        { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // 7.5 [ADMIN] إضافة موظف — المسمى الوظيفي
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_emp_department') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      await setState(env, tid, 'admin_awaiting_emp_salary', { ...data, department: text });
      return ctx.reply(
        `✅ المسمى الوظيفي: *${escapeMarkdown(text)}*\n\n*الخطوة 4/4* — أرسل الراتب الأساسي (بالأرقام):`,
        { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❽ [ADMIN] إضافة موظف — الراتب + الحفظ
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_emp_salary') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      const salary = parseFloat(text);
      if (isNaN(salary) || salary < 0) {
        return ctx.reply('⚠️ يرجى إرسال الراتب بالأرقام فقط. مثال: 3000');
      }

      const telegramId = data['telegramId'] as string;
      const fullName   = data['fullName']   as string;
      const department = data['department'] as string;

      await addEmployee(env, telegramId, fullName, salary, department);
      await logAction(env, emp.id, 'ADD_EMPLOYEE', `تم إضافة الموظف ${fullName} (${department}) براتب ${salary}`);
      await clearState(env, tid);

      return ctx.reply(
        `✅ *تم إضافة الموظف بنجاح!*\n\nالاسم: ${escapeMarkdown(fullName)}\nالمسمى الوظيفي: ${escapeMarkdown(department)}\nالراتب: ${salary} جنيه\nTelegram ID: \`${telegramId}\``,
        { parse_mode: 'Markdown', reply_markup: getEmployeeManagementMenu() }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❾ [ADMIN] تعديل راتب موظف
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_salary_update') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      const salary = parseFloat(text);
      if (isNaN(salary) || salary < 0) {
        return ctx.reply('⚠️ يرجى إرسال الراتب بالأرقام فقط.');
      }

      const empId = data['empId'] as number;
      const employee = await env.DB.prepare('SELECT full_name FROM Employees WHERE id = ?')
        .bind(empId).first() as any;

      await env.DB.prepare('UPDATE Employees SET base_salary = ? WHERE id = ?')
        .bind(salary, empId).run();
      await logAction(env, emp.id, 'UPDATE_SALARY', `تم تعديل راتب الموظف ID ${empId} (${employee?.full_name}) إلى ${salary}`);
      await clearState(env, tid);

      return ctx.reply(
        `✅ تم تحديث راتب *${escapeMarkdown(employee?.full_name ?? 'الموظف')}* إلى *${salary}* جنيه`,
        { parse_mode: 'Markdown', reply_markup: getAdminMenu() }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ❿ [ADMIN] تعديل إعداد الدوام
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_setting') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      const key = data['key'] as string;

      // تحقق من الصيغة
      if (key === 'work_start_time' || key === 'work_end_time') {
        if (!isValidTime(text)) {
          return ctx.reply('⚠️ صيغة الوقت غير صحيحة.\nاستخدم HH:MM — مثال: `09:00`', {
            parse_mode: 'Markdown',
          });
        }
      } else if (key === 'late_deduction_per_minute') {
        if (isNaN(parseFloat(text))) {
          return ctx.reply('⚠️ يرجى إرسال رقم صحيح. مثال: `2.5`', { parse_mode: 'Markdown' });
        }
      }

      await updateSetting(env, key, text);
      await logAction(env, emp.id, 'UPDATE_SETTING', `تم تغيير إعداد ${SETTING_NAMES[key] ?? key} إلى ${text}`);
      await clearState(env, tid);

      return ctx.reply(
        `✅ تم تحديث *"${SETTING_NAMES[key] ?? key}"* إلى: \`${escapeMarkdown(text)}\``,
        { parse_mode: 'Markdown', reply_markup: getAdminMenu() }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ⓫ [ADMIN] إرسال تعميم
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_broadcast_text') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      await createAnnouncement(env, text, emp.id);
      await logAction(env, emp.id, 'BROADCAST', `تم إرسال تعميم: ${text.substring(0, 50)}...`);

      const employees = await getAllEmployees(env);
      let sentCount = 0;
      for (const e of employees) {
        // استثناء المدير الذي أرسل التعميم
        if (e.telegram_id === emp.telegram_id) continue;

        try {
          await bot.api.sendMessage(e.telegram_id, `📢 *تعميم إداري:*\n\n${escapeMarkdown(text)}`, {
            parse_mode: 'Markdown',
          });
          sentCount++;
        } catch (_) {}
        // Sleep for 50ms to prevent Telegram rate limit (Too Many Requests)
        await new Promise(r => setTimeout(r, 50));
      }

      await clearState(env, tid);
      return ctx.reply(
        `✅ تم إرسال التعميم إلى *${sentCount}* موظف بنجاح.`,
        { parse_mode: 'Markdown', reply_markup: getAdminMenu() }
      );
    }

    // ──────────────────────────────────────────────────────────
    // ⓬ [ADMIN] بحث عن موظف بالاسم
    // ──────────────────────────────────────────────────────────
    if (state === 'admin_awaiting_emp_search') {
      if (!emp || emp.role !== 'admin') { await clearState(env, tid); return; }

      const searchTerms = text.toLowerCase();
      const allEmployees = await getAllEmployees(env);
      const results = allEmployees.filter(e => e.full_name.toLowerCase().includes(searchTerms));

      await clearState(env, tid);

      if (results.length === 0) {
        return ctx.reply(`📭 لا يوجد موظف يطابق: *${escapeMarkdown(text)}*`, {
          parse_mode: 'Markdown',
          reply_markup: getEmployeeManagementMenu()
        });
      }

      const kb = new InlineKeyboard();
      for (const e of results) {
        const icon = e.role === 'admin' ? '👑' : '👤';
        kb.text(`${icon} ${e.full_name}`, `admin_emp_view_${e.id}`).row();
      }
      kb.text('🔙 رجوع للإدارة', 'admin_panel');

      return ctx.reply(`🔍 *نتائج البحث عن:* ${escapeMarkdown(text)}\nعدد النتائج: ${results.length}`, {
        parse_mode: 'Markdown',
        reply_markup: kb
      });
    }
  });
}
