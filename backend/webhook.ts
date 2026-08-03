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



  const bot = new Bot(env.BOT_TOKEN);

  // NOTE: Proper Rate Limiting for Cloudflare Workers requires KV/D1/Durable Objects.
  // For now, simple endpoints rely on auth tokens or internal ID validations.

  registerStartCommand(bot, env);
  registerHelpCommand(bot, env);
  registerBroadcastCommand(bot, env);

  registerAttendanceCallbacks(bot, env);
  registerLeaveCallbacks(bot, env);
  registerLoanCallbacks(bot, env);
  registerSalaryCallbacks(bot, env);
  registerAdminCallbacks(bot, env);

  registerMessageHandler(bot, env);

  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (err: any) {
      console.error('[Bot Error]', err);
      try {
        if (ctx.chat) {
          await ctx.reply('❌ حدث خطأ داخلي في الخادم أثناء معالجة طلبك. يرجى المحاولة لاحقاً.').catch(() => {});
        }
      } catch (_) {}
    }
  });

  try {
    const cb = webhookCallback(bot, 'cloudflare-mod');
    return await cb(request);
  } catch (err) {
    console.error('[Webhook Error]', err);
    // Respond with 200 so Telegram stops retrying the same failing request
    return new Response('OK', { status: 200 });
  }
};
