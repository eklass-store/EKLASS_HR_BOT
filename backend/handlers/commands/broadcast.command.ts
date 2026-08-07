// ============================================================
// src/handlers/commands/broadcast.command.ts — /broadcast
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { getEmployeeByTelegramId, getAllEmployees } from '../../db/employees.db';
import { createAnnouncement } from '../../db/announcements.db';
import { escapeMarkdown } from '../../utils/markdown';

export function registerBroadcastCommand(bot: Bot, env: Env): void {
  bot.command('broadcast', async (ctx) => {
    const tid = String(ctx.from?.id);
    const admin = await getEmployeeByTelegramId(env, tid);

    if (!admin || admin.role !== 'admin') return;

    const fullText = ctx.message?.text ?? '';
    const text = fullText.slice('/broadcast '.length).trim();

    if (!text) {
      return ctx.reply(
        '⚠️ يرجى كتابة الرسالة بعد الأمر.\nمثال:\n/broadcast رسالة مهمة لجميع الموظفين'
      );
    }

    await createAnnouncement(env, text, admin.id);

    const employees = await getAllEmployees(env);
    let sentCount = 0;
    const chunkSize = 50;
    for (let i = 0; i < employees.length; i += chunkSize) {
      const chunk = employees.slice(i, i + chunkSize);
      const promises = chunk.map(emp => {
        if (emp.telegram_id === admin.telegram_id) return Promise.resolve(0);
        return bot.api.sendMessage(emp.telegram_id, `📢 *تعميم إداري:*\n\n${escapeMarkdown(text)}`, {
          parse_mode: 'Markdown',
        }).then(() => 1).catch(() => 0);
      });
      const results = await Promise.all(promises);
      sentCount += results.reduce((sum, val) => sum + val, 0);
    }
    await ctx.reply(`✅ تم إرسال التعميم إلى *${sentCount}* موظف بنجاح.`, {
      parse_mode: 'Markdown',
    });
  });
}
