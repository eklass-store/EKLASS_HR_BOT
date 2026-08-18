// ============================================================
// src/handlers/messages.handler.ts
// معالج الرسائل النصية لجميع المحادثات متعددة الخطوات:
//   - طلب إجازة (نوع → تاريخ بداية → تاريخ نهاية → سبب)
//   - طلب سلفة (مبلغ → سبب)
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
import { getMainMenu } from '../keyboards/main.keyboards';
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
  // ── Missing Callbacks ───────────────────────────────────────
  bot.callbackQuery('back_to_main', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');
    await ctx.editMessageText('اختر ما تريد من القائمة:', { reply_markup: getMainMenu(emp.role === 'admin') });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('admin_panel', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');
    const { getAdminMenu } = await import('../keyboards/main.keyboards');
    await ctx.editMessageText('⚙️ *لوحة تحكم الإدارة*\n\nاختر الإجراء المطلوب:', { parse_mode: 'Markdown', reply_markup: getAdminMenu() });
    await ctx.answerCallbackQuery();
  });

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
    if (!stateRecord) {
      const employee = await getEmployeeByTelegramId(env, tid);
      if (employee) {
        return ctx.reply(
          '💬 لا توجد عملية جارية.\nاستخدم القائمة أدناه:',
          { reply_markup: getMainMenu(employee.role === 'admin') }
        );
      }
      return ctx.reply(
        '👋 أنت غير مسجل في النظام.\nيرجى التواصل مع الإدارة لتسجيل بياناتك.'
      );
    }

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

      const requestedMonth = startDate.slice(0, 7);
      const monthlyRows = await env.DB.prepare(
        "SELECT CAST(SUM(julianday(end_date) - julianday(start_date) + 1) AS INTEGER) AS c FROM Leaves WHERE employee_id = ? AND status IN ('approved', 'pending') AND start_date LIKE ?"
      ).bind(emp.id, requestedMonth + '%').first() as any;
      const monthlyUsed = Number(monthlyRows?.c || 0);
      if (monthlyUsed + requestedDays > balance.monthlyQuota) {
        await clearState(env, tid);
        return ctx.reply(
          `⚠️ الحد الشهري للإجازات هو ${balance.monthlyQuota} يوم. المستخدم/المعلق: ${monthlyUsed} يوم.`,
          { reply_markup: getMainMenu(emp.role === 'admin') }
        );
      }

      const leaveId = await createLeave(env, emp.id, startDate, endDate, type, reason);
      if (!leaveId) {
        await clearState(env, tid);
        await ctx.reply('⚠️ عذراً، لم يتم تسجيل الإجازة لوجود تداخل مع إجازة أخرى قيد الانتظار أو معتمدة.', { reply_markup: getMainMenu(emp.role === 'admin') });
        return;
      }

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
      let loanId: number;
      try {
        loanId = await createLoan(env, emp.id, amount, text);
      } catch (err: any) {
        await clearState(env, tid);
        const msg = err.message.includes('pending loan') ? 'لديك طلب سلفة قيد الانتظار بالفعل.' : err.message;
        return ctx.reply(`⚠️ عذراً، لا يمكن معالجة طلبك: ${msg}`, { reply_markup: getMainMenu(emp.role === 'admin') });
      }

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

  });
}
