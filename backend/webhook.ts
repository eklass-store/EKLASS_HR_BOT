import { Bot, webhookCallback } from 'grammy';
import { Env } from './types';

// Commands
import { registerStartCommand }     from './handlers/commands/start.command';
import { registerHelpCommand }      from './handlers/commands/help.command';
import { registerBroadcastCommand } from './handlers/commands/broadcast.command';

// Callbacks
import { registerAttendanceCallbacks } from './handlers/callbacks/attendance.callback';
import { registerLeaveCallbacks }      from './handlers/callbacks/leaves.callback';
import { registerLoanCallbacks }       from './handlers/callbacks/loans.callback';
import { registerSalaryCallbacks }     from './handlers/callbacks/salary.callback';
import { registerAdminCallbacks }      from './handlers/callbacks/admin.callback';
import { registerMessageHandler } from './handlers/messages.handler';

export const handleWebhook = async (request: Request, env: Env): Promise<Response> => {
  if (!env.BOT_TOKEN) {
    return new Response('BOT_TOKEN is missing', { status: 500 });
  }

  if (env.WEBHOOK_SECRET) {
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretToken !== env.WEBHOOK_SECRET) {
      // DEBUG: Send message to admin showing the mismatch
      if (env.INITIAL_ADMIN_ID) {
        const msg = `⚠️ *تنبيه أمني: فشل قفل الأمان!*\n\nتليجرام أرسل: \`${secretToken || 'لا شيء'}\`\nCloudflare يحتوي على: \`${env.WEBHOOK_SECRET}\`\n\nيوجد اختلاف بين الكلمتين (ربما مسافة زائدة أو حرف خاطئ)!`;
        try {
          await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: env.INITIAL_ADMIN_ID, text: msg, parse_mode: 'Markdown' })
          });
        } catch (_) {}
      }
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const bot = new Bot(env.BOT_TOKEN);

  // ── Error Handling Middleware ──
  // MUST be registered before any handlers to catch their errors!
  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (err: any) {
      console.error('[Bot Error]', err);
      try {
        if (ctx.chat) {
          await ctx.reply(`❌ حدث خطأ داخلي في الخادم:\n<pre>${err.message || String(err)}</pre>`, { parse_mode: 'HTML' }).catch(() => {});
        }
      } catch (_) {}
    }
  });

  // Commands
  registerStartCommand(bot, env);
  registerHelpCommand(bot, env);
  registerBroadcastCommand(bot, env);

  // Callbacks
  registerAttendanceCallbacks(bot, env);
  registerLeaveCallbacks(bot, env);
  registerLoanCallbacks(bot, env);
  registerSalaryCallbacks(bot, env);
  registerAdminCallbacks(bot, env);

  registerMessageHandler(bot, env);



  try {
    const cb = webhookCallback(bot, 'cloudflare-mod');
    return await cb(request);
  } catch (err) {
    console.error('[Webhook Error]', err);
    // Respond with 200 so Telegram stops retrying the same failing request
    return new Response('OK', { status: 200 });
  }
};
