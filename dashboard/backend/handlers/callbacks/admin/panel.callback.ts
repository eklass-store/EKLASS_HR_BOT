// ============================================================
// src/handlers/callbacks/admin/panel.callback.ts
// FIX BUG-05: إضافة handler لـ admin_panel + admin_broadcast
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId } from '../../../db/employees.db';
import { setState } from '../../../db/state.db';
import { getMainMenu, getAdminMenu } from '../../../keyboards/main.keyboards';

export function registerAdminPanelCallbacks(bot: Bot, env: Env): void {

  // ── لوحة الإدارة ──────────────────────────────────────────
  bot.callbackQuery('admin_panel', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await ctx.editMessageText('⚙️ *لوحة الإدارة*\nاختر الإجراء المطلوب:', {
      parse_mode: 'Markdown',
      reply_markup: getAdminMenu(),
    });
    await ctx.answerCallbackQuery();
  });

  // ── رجوع للقائمة الرئيسية ─────────────────────────────────
  bot.callbackQuery('back_to_main', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp) return ctx.answerCallbackQuery('أنت غير مسجل!');

    await ctx.editMessageText(
      `🏢 أهلاً بك *${emp.full_name}*!\nاختر ما تريد من القائمة:`,
      { parse_mode: 'Markdown', reply_markup: getMainMenu(emp.role === 'admin') }
    );
    await ctx.answerCallbackQuery();
  });

  // ── إرسال تعميم — FIX BUG-05: بدء conversation state ────
  bot.callbackQuery('admin_broadcast', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_broadcast_text');
    await ctx.editMessageText(
      '📢 *إرسال تعميم*\n\nأرسل نص التعميم الذي تريد إرساله لجميع الموظفين:\n\n_(أرسل /cancel للإلغاء)_',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery();
  });
}
