// ============================================================
// src/handlers/callbacks/leaves.callback.ts
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId, getAdmins, getEmployeeById } from '../../db/employees.db';
import {
  updateLeaveStatus,
  getLeaveById,
  getEmployeeLeaves,
  hasPendingLeave,
  getLeaveBalance,
} from '../../db/leaves.db';
import { setState } from '../../db/state.db';
import { getMainMenu } from '../../keyboards/main.keyboards';
import { escapeMarkdown } from '../../utils/markdown';
import {
  getLeaveTypeKeyboard,
  getLeaveApprovalKeyboard,
  LEAVE_TYPE_NAMES,
} from '../../keyboards/leave.keyboards';
import { logAction } from '../../db/audit.db';

export function registerLeaveCallbacks(bot: Bot, env: Env): void {

  // ── بدء طلب الإجازة ───────────────────────────────────────
  bot.callbackQuery('action_leave', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    // منع التكرار
    if (await hasPendingLeave(env, emp.id)) {
      await ctx.editMessageText(
        '⚠️ لديك طلب إجازة قيد الانتظار بالفعل.\nانتظر موافقة الإدارة.',
        { reply_markup: getMainMenu(emp.role === 'admin') }
      );
      return ctx.answerCallbackQuery();
    }

    await setState(env, tid, 'awaiting_leave_type');
    await ctx.editMessageText('🏖️ *طلب إجازة*\n\nاختر نوع الإجازة:', {
      parse_mode: 'Markdown',
      reply_markup: getLeaveTypeKeyboard(),
    });
    await ctx.answerCallbackQuery();
  });

  // ── اختيار نوع الإجازة ────────────────────────────────────
  bot.callbackQuery(/^leave_type_(annual|sick|emergency)$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const leaveType = ctx.callbackQuery.data.replace('leave_type_', '');

    await setState(env, tid, 'awaiting_leave_start_date', { type: leaveType });

    await ctx.editMessageText(
      `✅ النوع: *${LEAVE_TYPE_NAMES[leaveType]}*\n\n📅 أرسل تاريخ *بداية* الإجازة:\nالصيغة: YYYY-MM-DD\nمثال: 2024-08-15`,
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });

  // ── إجازاتي ───────────────────────────────────────────────
  bot.callbackQuery('action_leaves', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const leaves = await getEmployeeLeaves(env, emp.id);
    const balance = await getLeaveBalance(env, emp.id);
    const icons: Record<string, string> = { pending: '⏳', approved: '✅', rejected: '❌' };

    let text = `🏷️ *إجازاتي*\n\n📊 الحصة السنوية: ${balance.quota} يوم\nالمُستخدَم: ${balance.approved} يوم | معلّق: ${balance.pending} يوم\nالمتبقي: ${balance.quota - balance.approved} يوم\n\n`;

    const kb = new InlineKeyboard();

    if (leaves.length === 0) {
      text += 'لا توجد طلبات إجازة مسجلة.';
    } else {
      for (const l of leaves) {
        text += `${icons[l.status] ?? '❓'} ${l.start_date} ← ${l.end_date} (${LEAVE_TYPE_NAMES[l.type] ?? l.type})\n`;
        if (l.status === 'pending') {
          kb.text(`🗑️ سحب طلب (${l.start_date})`, `cancel_my_leave_${l.id}`).row();
        }
      }
    }

    if (emp.role === 'admin') {
      kb.text('⚙️ لوحة الإدارة', 'admin_panel').row();
    }
    kb.text('🎛️ القائمة الرئيسية', 'back_to_main');

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
    await ctx.answerCallbackQuery();
  });

  // ── سحب (إلغاء) الطلب من قبل الموظف ───────────────────────
  bot.callbackQuery(/^cancel_my_leave_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const leaveId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const leave = await getLeaveById(env, leaveId);

    if (!leave || leave.employee_id !== emp.id) {
      return ctx.answerCallbackQuery('الطلب غير موجود أو لا تملكه!');
    }
    if (leave.status !== 'pending') {
      return ctx.answerCallbackQuery('لا يمكن إلغاء الطلب لأنه تمت معالجته بالفعل.');
    }

    const kb = new InlineKeyboard()
      .text('✅ نعم، متأكد', `confirm_cancel_leave_${leaveId}`).row()
      .text('❌ لا، تراجع', 'action_leaves');

    await ctx.editMessageText(`❓ هل أنت متأكد من إلغاء طلب الإجازة (${leave.start_date})؟`, {
      reply_markup: kb
    });
    await ctx.answerCallbackQuery();
  });

  // ── التأكيد الفعلي لإلغاء الإجازة ─────────────────────────
  bot.callbackQuery(/^confirm_cancel_leave_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    const leaveId = parseInt(ctx.callbackQuery.data.split('_').at(-1)!);
    const leave = await getLeaveById(env, leaveId);

    if (!leave || leave.employee_id !== emp.id || leave.status !== 'pending') {
      return ctx.answerCallbackQuery('عذراً، الطلب غير متاح.');
    }

    await env.DB.prepare("DELETE FROM Leaves WHERE id = ?").bind(leaveId).run();
    
    await ctx.editMessageText(`✅ تم إلغاء طلب الإجازة (${leave.start_date}) بنجاح.`, {
      reply_markup: getMainMenu(emp.role === 'admin')
    });
    await ctx.answerCallbackQuery();
  });

  // ── موافقة / رفض الإجازة (أدمن) — FIX BUG-07 ─────────────
  bot.callbackQuery(/^(approve|reject)_leave_\d+$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);
    if (!admin || admin.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const parts = ctx.callbackQuery.data.split('_');
    const isApprove = parts[0] === 'approve';
    const leaveId = parseInt(parts[2]);

    const leave = await getLeaveById(env, leaveId);
    if (!leave) return ctx.answerCallbackQuery('الطلب غير موجود!');
    if (leave.status !== 'pending') {
      return ctx.answerCallbackQuery(`تمت معالجة هذا الطلب مسبقاً (${leave.status})`);
    }

    const newStatus = isApprove ? 'approved' : 'rejected';
    await updateLeaveStatus(env, leaveId, newStatus, admin.id);
    await logAction(env, admin.id, isApprove ? 'APPROVE_LEAVE' : 'REJECT_LEAVE', `تم ${isApprove ? 'قبول' : 'رفض'} إجازة ID ${leaveId} للموظف ID ${leave.employee_id}`);

    const employee = await getEmployeeById(env, leave.employee_id);
    if (employee) {
      const notif = isApprove
        ? `✅ *تمت الموافقة على إجازتك*\n📅 ${leave.start_date} ← ${leave.end_date}\n(${LEAVE_TYPE_NAMES[leave.type] ?? leave.type})\nبالتوفيق! 🌟`
        : `❌ *تم رفض طلب إجازتك*\n📅 ${leave.start_date} ← ${leave.end_date}\nيرجى التواصل مع الإدارة لمزيد من التفاصيل.`;
      try {
        await bot.api.sendMessage(employee.telegram_id, notif, { parse_mode: 'Markdown' });
      } catch (_) {}
    }

    await ctx.editMessageText(
      `${isApprove ? '✅ تمت الموافقة' : '❌ تم الرفض'} على إجازة *${escapeMarkdown(employee?.full_name ?? 'الموظف')}*\n📅 ${leave.start_date} ← ${leave.end_date}`,
      { parse_mode: 'Markdown', reply_markup: undefined }
    );
    await ctx.answerCallbackQuery();
  });

  // ── إلغاء أي عملية جارية ──────────────────────────────────
  bot.callbackQuery('cancel_action', async (ctx) => {
    const tid = String(ctx.from?.id);
    const { clearState } = await import('../../db/state.db');
    await clearState(env, tid);
    const emp = await getEmployeeByTelegramId(env, tid);
    await ctx.editMessageText('✅ تم الإلغاء.', {
      reply_markup: emp ? getMainMenu(emp.role === 'admin') : undefined,
    });
    await ctx.answerCallbackQuery();
  });
}
