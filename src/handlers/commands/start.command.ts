// ============================================================
// src/handlers/commands/start.command.ts
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId } from '../../db/employees.db';
import { getMainMenu } from '../../keyboards/main.keyboards';

export function registerStartCommand(bot: Bot, env: Env): void {
  bot.command('start', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);

    if (!emp) {
      return ctx.reply(
        '👋 أهلاً بك!\n\nأنت غير مسجل في نظام الموارد البشرية.\nيرجى التواصل مع الإدارة لتسجيل بياناتك.\n\nاستخدم /help لمزيد من المعلومات.'
      );
    }

    await ctx.reply(
      `🏢 أهلاً بك *${emp.full_name}*!\nاختر ما تريد من القائمة:`,
      { reply_markup: getMainMenu(emp.role === 'admin'), parse_mode: 'Markdown' }
    );
  });
}
