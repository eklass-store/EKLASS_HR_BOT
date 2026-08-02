// ============================================================
// src/api/routes.ts — REST API Endpoints
// ============================================================
import { Env } from '../types';

const apiRateLimit = new Map<string, { count: number; timestamp: number }>();

export async function handleApiRoutes(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // ── Rate Limiting (In-Memory) ──
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const now = Date.now();
    const record = apiRateLimit.get(ip) || { count: 0, timestamp: now };
    
    if (now - record.timestamp > 60000) {
      record.count = 0;
      record.timestamp = now;
    }
    
    if (record.count >= 20) { // Max 20 requests per minute per IP
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    record.count++;
    apiRateLimit.set(ip, record);

    // Secure API routes
    const apiKeyHeader = request.headers.get('X-API-KEY');
    const apiKeyQuery = url.searchParams.get('api_key');
    const providedKey = apiKeyHeader || apiKeyQuery;

    if (!env.API_KEY || providedKey !== env.API_KEY) {
      return new Response('Unauthorized: Invalid or missing API key', { status: 401 });
    }
  }

  // ── GET /api/stats ─────────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/stats') {
    const [empCount, attCount, pendingLeaves, pendingLoans] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS c FROM Employees WHERE is_active = 1").first() as Promise<any>,
      env.DB.prepare("SELECT COUNT(*) AS c FROM Attendance").first() as Promise<any>,
      env.DB.prepare("SELECT COUNT(*) AS c FROM Leaves WHERE status = 'pending'").first() as Promise<any>,
      env.DB.prepare("SELECT COUNT(*) AS c FROM Loans WHERE status = 'pending'").first() as Promise<any>,
    ]);

    return new Response(
      JSON.stringify({
        employees:        empCount?.c        ?? 0,
        attendance_records: attCount?.c      ?? 0,
        pending_leaves:   pendingLeaves?.c   ?? 0,
        pending_loans:    pendingLoans?.c    ?? 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── GET /api/employees ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/employees') {
    const result = await env.DB.prepare(
      "SELECT id, full_name, role, department, base_salary, created_at FROM Employees WHERE is_active = 1 ORDER BY full_name"
    ).all();
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── GET /api/export/employees ──────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/employees') {
    const { exportEmployeesExcel } = await import('./export');
    return await exportEmployeesExcel(env);
  }

  // ── GET /api/export/monthly ─────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/monthly') {
    const month = url.searchParams.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response('Invalid month parameter. Format must be YYYY-MM', { status: 400 });
    }
    const { exportMonthlyReport } = await import('./export');
    return await exportMonthlyReport(env, month);
  }

  // ── GET /api/debug ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/debug') {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── GET /api/set-webhook ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/set-webhook') {
    const webhookUrl = `https://${url.host}`;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
    const data = await res.json();
    return new Response(JSON.stringify({ setting: webhookUrl, data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null; // لا يوجد route مطابق — أكمل لمعالجة الـ webhook
}
