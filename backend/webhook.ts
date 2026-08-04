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
    const expected = env.WEBHOOK_SECRET.replace(/[^a-zA-Z0-9_-]/g, '');
    if (expected) {
      const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secret !== expected) {
        return new Response('Unauthorized', { status: 401 });
      }
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
        const errorDetails = err instanceof Error ? err.stack || err.message : JSON.stringify(err);
        await env.DB.prepare("INSERT INTO AuditLogs (admin_id, action, details) VALUES (0, 'WEBHOOK_ERROR', ?)").bind(String(errorDetails).substring(0, 500)).run().catch(() => {});
        if (ctx.chat) {
          await ctx.reply(`❌ حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.`, { parse_mode: 'HTML' }).catch(() => {});
        }
      } catch (_) {}
    }
  });

  // Commands
  bot.command('ping', async (ctx) => {
    await ctx.reply('🏓 البوت يعمل بنجاح والويب هوك متصل!');
  });
  
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
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    try {
      const errorDetails = err instanceof Error ? err.stack || err.message : JSON.stringify(err);
      await env.DB.prepare("INSERT INTO AuditLogs (admin_id, action, details) VALUES (0, 'WEBHOOK_CRITICAL_ERROR', ?)").bind(String(errorDetails).substring(0, 500)).run().catch(() => {});
    } catch (_) {}
    return new Response('OK', { status: 200 });
  }
};
