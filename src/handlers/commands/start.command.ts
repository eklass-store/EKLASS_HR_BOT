// ============================================================
// src/handlers/commands/start.command.ts
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId, getAdmins, addEmployee } from '../../db/employees.db';
import { escapeMarkdown } from '../../utils/markdown';
import { getMainMenu, getPersistentMenu } from '../../keyboards/main.keyboards';

export function registerStartCommand(bot: Bot, env: Env): void {
  bot.command('start', async (ctx) => {
    const tid = String(ctx.from?.id);
    const emp = await getEmployeeByTelegramId(env, tid);

    if (!emp) {
      // Check if this user is the initial admin specified in env
      if (env.INITIAL_ADMIN_ID && tid === env.INITIAL_ADMIN_ID) {
        const admins = await getAdmins(env);
        if (admins.length === 0) { // Only if no admins exist yet
          const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Admin';
          await addEmployee(env, tid, fullName, 0, 'admin');
          
          await ctx.reply(
            `🎉 مرحباً بك يا *${escapeMarkdown(fullName)}*!\n\nتم تعيينك كـ *مدير النظام (Admin)* بناءً على الإعدادات الأولية.`,
            { reply_markup: getPersistentMenu(), parse_mode: 'Markdown' }
          );
          return ctx.reply('استخدم القائمة أدناه للتحكم في النظام:', { reply_markup: getMainMenu(true) });
        }
      }

      return ctx.reply(
        '👋 أهلاً بك!\n\nأنت غير مسجل في نظام الموارد البشرية.\nيرجى التواصل مع الإدارة لتسجيل بياناتك.\n\nيمكنك استخدام الزر بالأسفل لمعرفة معرّفك.',
        { reply_markup: getPersistentMenu() }
      );
    }

    await ctx.reply(
      `🏢 أهلاً بك *${escapeMarkdown(emp.full_name)}*!`,
      { reply_markup: getPersistentMenu(), parse_mode: 'Markdown' }
    );
    await ctx.reply('اختر ما تريد من القائمة:', { reply_markup: getMainMenu(emp.role === 'admin') });
  });
}
