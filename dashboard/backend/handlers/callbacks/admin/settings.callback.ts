// ============================================================
// src/handlers/callbacks/admin/settings.callback.ts
// تعديل إعدادات الدوام من داخل البوت (وقت البدء/الانتهاء/الخصم)
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId } from '../../../db/employees.db';
import { getSettings } from '../../../db/settings.db';
import { setState } from '../../../db/state.db';
import { getAdminMenu } from '../../../keyboards/main.keyboards';

export function registerAdminSettingsCallbacks(bot: Bot, env: Env): void {

  // ── عرض الإعدادات الحالية ─────────────────────────────────
  bot.callbackQuery('admin_settings', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const s = await getSettings(env);

    const kb = new InlineKeyboard()
      .text('⏰ وقت البدء',         'settings_edit_start').row()
      .text('⏰ وقت الانتهاء',      'settings_edit_end').row()
      .text('💸 خصم دقيقة التأخير', 'settings_edit_deduction').row()
      .text('🔙 رجوع',             'admin_panel');

    await ctx.editMessageText(
      `⚙️ *إعدادات الدوام الحالية:*\n\n` +
      `🕘 بداية الدوام:          ${s['work_start_time']        ?? '09:00'}\n` +
      `🕔 نهاية الدوام:          ${s['work_end_time']          ?? '17:00'}\n` +
      `💰 خصم دقيقة التأخير:    ${s['late_deduction_per_minute'] ?? '0'} جنيه\n\n` +
      `_(أرسل /cancel للإلغاء في أي وقت)_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
    await ctx.answerCallbackQuery();
  });

  // ── تعديل وقت البدء ───────────────────────────────────────
  bot.callbackQuery('settings_edit_start', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_setting', { key: 'work_start_time' });
    await ctx.editMessageText(
      '⏰ أرسل وقت *بداية* الدوام الجديد:\nالصيغة: HH:MM\nمثال: `08:30`',
      { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
    );
    await ctx.answerCallbackQuery();
  });

  // ── تعديل وقت الانتهاء ────────────────────────────────────
  bot.callbackQuery('settings_edit_end', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_setting', { key: 'work_end_time' });
    await ctx.editMessageText(
      '⏰ أرسل وقت *انتهاء* الدوام الجديد:\nالصيغة: HH:MM\nمثال: `17:00`',
      { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
    );
    await ctx.answerCallbackQuery();
  });

  // ── تعديل خصم دقيقة التأخير ───────────────────────────────
  bot.callbackQuery('settings_edit_deduction', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_setting', { key: 'late_deduction_per_minute' });
    await ctx.editMessageText(
      '💸 أرسل مقدار الخصم لكل دقيقة تأخير (بالجنيه):\nمثال: `2.5`\n_(0 = لا خصم)_',
      { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
    );
    await ctx.answerCallbackQuery();
  });
}
