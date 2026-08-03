// ============================================================
// src/handlers/callbacks/admin/holidays.callback.ts
// ============================================================
import { Bot, InlineKeyboard } from 'grammy';
import { Env } from '../../../types';
import { getEmployeeByTelegramId } from '../../../db/employees.db';
import { getHolidaysInMonth, removeHoliday } from '../../../db/holidays.db';
import { setState } from '../../../db/state.db';
import { getAdminMenu } from '../../../keyboards/main.keyboards';
import { getCurrentMonth } from '../../../utils/time';

export function registerAdminHolidaysCallbacks(bot: Bot, env: Env): void {
  bot.callbackQuery('admin_holidays', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const month = getCurrentMonth(env.TIMEZONE);
    const holidays = await getHolidaysInMonth(env, month);

    const kb = new InlineKeyboard();
    let text = `🏖️ *إدارة العطلات (${month})*\n\n`;

    if (holidays.length === 0) {
      text += `لا توجد عطلات رسمية مضافة في هذا الشهر.\n`;
    } else {
      for (const h of holidays as any[]) {
        text += `• ${h.holiday_date} - ${h.description}\n`;
        kb.text(`🗑️ حذف عطلة ${h.holiday_date}`, `admin_holiday_del_${h.holiday_date}`).row();
      }
    }

    kb.text('➕ إضافة عطلة', 'admin_holiday_add').row();
    kb.text('🔙 رجوع', 'admin_panel');

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('admin_holiday_add', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    await setState(env, tid, 'admin_awaiting_holiday_date');
    await ctx.editMessageText(
      '🏖️ *إضافة عطلة جديدة*\n\nأرسل تاريخ العطلة بصيغة YYYY-MM-DD\nمثال: `2024-01-01`',
      { parse_mode: 'Markdown', reply_markup: new InlineKeyboard().text('🔙 إلغاء', 'cancel_action') }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^admin_holiday_del_\d{4}-\d{2}-\d{2}$/, async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);
    if (!emp || emp.role !== 'admin') return ctx.answerCallbackQuery('غير مصرح لك!');

    const date = ctx.callbackQuery.data.replace('admin_holiday_del_', '');
    await removeHoliday(env, date);

    await ctx.editMessageText('✅ تم حذف العطلة بنجاح.', {
      reply_markup: new InlineKeyboard().text('🔙 رجوع للعطلات', 'admin_holidays')
    });
    await ctx.answerCallbackQuery();
  });
}
