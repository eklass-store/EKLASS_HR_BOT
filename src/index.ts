// ============================================================
// src/index.ts — Cloudflare Worker Entry Point (v2 Refactored)
// الملف الرئيسي: يربط كل الـ handlers معاً فقط — لا منطق هنا
// ============================================================
import { Bot } from 'grammy';
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
    const bot = new Bot(env.BOT_TOKEN);

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

    // IMPORTANT: Message handler يجب أن يكون أخيراً
    // حتى لا يتعارض مع الأوامر (/start, /help, etc.)
    registerMessageHandler(bot, env);

    try {
      const payload = await request.json();
      await bot.init();
      await bot.handleUpdate(payload as any);
      return new Response('OK');
    } catch (err) {
      console.error('[HR Bot Error]', err);
      return new Response('Internal Error', { status: 500 });
    }
  },
};
