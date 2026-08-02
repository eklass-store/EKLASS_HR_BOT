// ============================================================
// src/handlers/commands/start.command.ts
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId, getAdmins, addEmployee } from '../../db/employees.db';
import { escapeMarkdown } from '../../utils/markdown';
import { getMainMenu } from '../../keyboards/main.keyboards';

export function registerStartCommand(bot: Bot, env: Env): void {
  bot.command('start', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);

    if (!emp) {
      // Check if there are any admins. If none, make this user the first admin.
      const admins = await getAdmins(env);
      if (admins.length === 0) {
        const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Admin';
        await addEmployee(env, tid, fullName, 0, 'admin');
        
        return ctx.reply(
          `🎉 مرحباً بك يا *${escapeMarkdown(fullName)}*!\n\nبما أنك أول مستخدم، تم تعيينك كـ *مدير النظام (Admin)* تلقائياً.\nاستخدم القائمة أدناه للتحكم في النظام.`,
          { reply_markup: getMainMenu(true), parse_mode: 'Markdown' }
        );
      }

      return ctx.reply(
        '👋 أهلاً بك!\n\nأنت غير مسجل في نظام الموارد البشرية.\nيرجى التواصل مع الإدارة لتسجيل بياناتك.\n\nاستخدم /help لمزيد من المعلومات.'
      );
    }

    await ctx.reply(
      `🏢 أهلاً بك *${escapeMarkdown(emp.full_name)}*!\nاختر ما تريد من القائمة:`,
      { reply_markup: getMainMenu(emp.role === 'admin'), parse_mode: 'Markdown' }
    );
  });
}
