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
    const update = await request.json();
    await bot.handleUpdate(update);
    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    try {
        if (env.INITIAL_ADMIN_ID) {
           await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage?chat_id=${env.INITIAL_ADMIN_ID}&text=FatalError:%20${err.message}`);
        }
    } catch (_) {}
    return new Response('OK', { status: 200 });
  }
};
