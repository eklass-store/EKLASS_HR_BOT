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
import { registerMessageHandler } from './handlers/messages.handler';

export const handleWebhook = async (request: Request, env: Env): Promise<Response> => {
  if (!env.BOT_TOKEN) {
    return new Response('BOT_TOKEN is missing', { status: 500 });
  }

  if (env.WEBHOOK_SECRET) {
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretToken !== env.WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  const bot = new Bot(env.BOT_TOKEN);

  // NOTE BUG-K: Rate Limiter باستخدام globalThis لا يعمل في Cloudflare Workers
  // لأن كل request معزول في context خاص ولا يشارك الذاكرة بين الطلبات
  // لتفعيل Rate Limiting حقيقي يجب استخدام: Cloudflare Rate Limiting Rules أو KV/Durable Objects

  registerStartCommand(bot, env);
  registerHelpCommand(bot, env);
  registerBroadcastCommand(bot, env);

  registerAttendanceCallbacks(bot, env);
  registerLeaveCallbacks(bot, env);
  registerLoanCallbacks(bot, env);
  registerSalaryCallbacks(bot, env);

  registerMessageHandler(bot, env);

  bot.catch((err) => {
    console.error('[Bot Error]', err);
  });

  try {
    const cb = webhookCallback(bot, 'cloudflare-mod');
    return await cb(request);
  } catch (err) {
    console.error('[Webhook Error]', err);
    return new Response('OK', { status: 200 });
  }
};
