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
import { registerAdminPanelCallbacks }     from './handlers/callbacks/admin/panel.callback';
import { registerAdminEmployeeCallbacks }  from './handlers/callbacks/admin/employees.callback';
import { registerAdminPayrollCallbacks }   from './handlers/callbacks/admin/payroll.callback';
import { registerAdminReportCallbacks }    from './handlers/callbacks/admin/reports.callback';
import { registerAdminSettingsCallbacks }  from './handlers/callbacks/admin/settings.callback';
import { registerAdminHolidaysCallbacks }  from './handlers/callbacks/admin/holidays.callback';
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

  bot.use(async (ctx, next) => {
    const tid = String(ctx.from?.id);
    if (!tid || tid === 'undefined') return next();

    const now = Date.now();
    const WINDOW_MS = 2000;
    const MAX_REQUESTS = 4;

    if (!(globalThis as any).rateLimits) {
      (globalThis as any).rateLimits = new Map<string, { last_request_time: number; request_count: number }>();
    }
    const rateLimits = (globalThis as any).rateLimits as Map<string, { last_request_time: number; request_count: number }>;

    const record = rateLimits.get(tid);
    if (!record) {
      rateLimits.set(tid, { last_request_time: now, request_count: 1 });
    } else {
      if (now - record.last_request_time < WINDOW_MS) {
        if (record.request_count >= MAX_REQUESTS) {
          return;
        } else {
          record.request_count++;
        }
      } else {
        record.last_request_time = now;
        record.request_count = 1;
      }
    }

    if (rateLimits.size > 10000) rateLimits.clear();
    return next();
  });

  registerStartCommand(bot, env);
  registerHelpCommand(bot, env);
  registerBroadcastCommand(bot, env);

  registerAttendanceCallbacks(bot, env);
  registerLeaveCallbacks(bot, env);
  registerLoanCallbacks(bot, env);
  registerSalaryCallbacks(bot, env);

  registerAdminPanelCallbacks(bot, env);
  registerAdminEmployeeCallbacks(bot, env);
  registerAdminPayrollCallbacks(bot, env);
  registerAdminReportCallbacks(bot, env);
  registerAdminSettingsCallbacks(bot, env);
  registerAdminHolidaysCallbacks(bot, env);

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
