// ============================================================
// src/index.ts — Cloudflare Worker Entry Point (v2 Refactored)
// الملف الرئيسي: يربط كل الـ handlers معاً فقط — لا منطق هنا
// ============================================================
import { Bot, webhookCallback } from 'grammy';
import { Env } from './types';

// API
import { handleApiRoutes } from './api/routes';

// Commands
import { registerStartCommand }     from './handlers/commands/start.command';
import { registerHelpCommand }      from './handlers/commands/help.command';
import { registerBroadcastCommand } from './handlers/commands/broadcast.command';

// Callbacks — Employee
import { registerAttendanceCallbacks } from './handlers/callbacks/attendance.callback';
import { registerLeaveCallbacks }      from './handlers/callbacks/leaves.callback';
import { registerLoanCallbacks }       from './handlers/callbacks/loans.callback';
import { registerSalaryCallbacks }     from './handlers/callbacks/salary.callback';

// Callbacks — Admin
import { registerAdminPanelCallbacks }     from './handlers/callbacks/admin/panel.callback';
import { registerAdminEmployeeCallbacks }  from './handlers/callbacks/admin/employees.callback';
import { registerAdminPayrollCallbacks }   from './handlers/callbacks/admin/payroll.callback';
import { registerAdminReportCallbacks }    from './handlers/callbacks/admin/reports.callback';
import { registerAdminSettingsCallbacks }  from './handlers/callbacks/admin/settings.callback';
import { registerAdminHolidaysCallbacks }  from './handlers/callbacks/admin/holidays.callback';

// Message Handler (multi-step conversations)
import { registerMessageHandler } from './handlers/messages.handler';

export { Env };

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (!env.BOT_TOKEN) {
      return new Response('BOT_TOKEN is missing', { status: 500 });
    }

    // ── 1. API Routes (GET requests) ───────────────────────────
    const apiResponse = await handleApiRoutes(request, env);
    if (apiResponse) return apiResponse;

    // ── 2. Health check (GET /) ────────────────────────────────
    if (request.method !== 'POST') {
      return new Response('🤖 EKLASS HR Bot is running!', { status: 200 });
    }

    // ── 3. Telegram Webhook (POST) ─────────────────────────────
    if (env.WEBHOOK_SECRET) {
      const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secretToken !== env.WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const bot = new Bot(env.BOT_TOKEN);

    // Rate Limiting Middleware (In-Memory)
    bot.use(async (ctx, next) => {
      const tid = String(ctx.from?.id);
      if (!tid || tid === 'undefined') return next();

      const now = Date.now();
      const WINDOW_MS = 2000; // 2 seconds
      const MAX_REQUESTS = 4;

      // Initialize global memory map if it doesn't exist (persists across warm invocations in Cloudflare Workers)
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
            return; // Drop request silently
          } else {
            record.request_count++;
          }
        } else {
          record.last_request_time = now;
          record.request_count = 1;
        }
      }

      // Cleanup memory to prevent leaks
      if (rateLimits.size > 10000) rateLimits.clear();

      return next();
    });

    // Register all handlers
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

    // Catch errors gracefully
    bot.catch((err) => {
      console.error('[Bot Error]', err);
    });

    try {
      const cb = webhookCallback(bot, 'cloudflare-mod');
      return await cb(request);
    } catch (err) {
      console.error('[Webhook Error]', err);
      // Return 200 anyway so Telegram drops the poison pill update
      return new Response('OK', { status: 200 });
    }
  },
};
