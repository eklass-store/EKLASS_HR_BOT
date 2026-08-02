// ============================================================
// src/handlers/commands/broadcast.command.ts — /broadcast
// FIX BUG-06: استخدام slice بدل replace لقص الأمر بدقة
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

    // FIX BUG-06: slice بدل replace — يضمن قص صحيح بغض النظر عن محتوى الرسالة
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
    for (const emp of employees) {
      try {
        await bot.api.sendMessage(emp.telegram_id, `📢 *تعميم إداري:*\n\n${escapeMarkdown(text)}`, {
          parse_mode: 'Markdown',
        });
        sentCount++;
      } catch (_) {
        // المستخدم ربما حجب البوت — نتجاهل ونكمل
      }
    }
    await ctx.reply(`✅ تم إرسال التعميم إلى *${sentCount}* موظف بنجاح.`, {
      parse_mode: 'Markdown',
    });
  });
}
