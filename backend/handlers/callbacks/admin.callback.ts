import { Bot, Context } from 'grammy';
import { Env } from '../../types';

export const registerAdminCallbacks = (bot: Bot, env: Env) => {
  bot.callbackQuery('admin_add_employee', async (ctx: Context) => {
    await ctx.answerCallbackQuery({
      text: 'هذه الميزة متاحة حالياً عبر لوحة التحكم (Dashboard) فقط.',
      show_alert: true
    });
  });

  bot.callbackQuery('admin_daily_report', async (ctx: Context) => {
    await ctx.answerCallbackQuery({
      text: 'ميزة التقرير اليومي سيتم تفعيلها قريباً.',
      show_alert: true
    });
  });

  bot.callbackQuery('admin_settings', async (ctx: Context) => {
    await ctx.answerCallbackQuery({
      text: 'إعدادات النظام متاحة عبر لوحة التحكم (Dashboard).',
      show_alert: true
    });
  });
};
