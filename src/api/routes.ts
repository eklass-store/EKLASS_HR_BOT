// ============================================================
// src/api/routes.ts — REST API Endpoints
// ============================================================
import { Env } from '../types';

export async function handleApiRoutes(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);

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
    return new Response(JSON.stringify({ setting: webhookUrl, ...data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null; // لا يوجد route مطابق — أكمل لمعالجة الـ webhook
}
