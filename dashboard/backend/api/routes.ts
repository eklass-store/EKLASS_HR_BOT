// ============================================================
// src/api/routes.ts — REST API Endpoints with JWT & CORS
// ============================================================
import { Env } from '../types';
import { SignJWT, jwtVerify } from 'jose';
import { handleAdminRoutes } from './admin';

// Helper for CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY',
};

export async function handleApiRoutes(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    if (url.pathname.startsWith('/api/')) {
      return new Response(null, { headers: corsHeaders });
    }
    return null;
  }

  if (!url.pathname.startsWith('/api/')) {
    return null;
  }

  // ── POST /api/set-webhook ─────────────────────────────────────
  if (request.method === 'POST' && url.pathname === '/api/set-webhook') {
    const webhookUrl = `https://${url.host}`;
    let apiUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
    if (env.WEBHOOK_SECRET) {
      apiUrl += `&secret_token=${env.WEBHOOK_SECRET}`;
    }
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify({ setting: webhookUrl, data }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── POST /api/auth/telegram ──────────────────────────────────
  if (request.method === 'POST' && url.pathname === '/api/auth/telegram') {
    try {
      const data = await request.json() as any;
      const { hash, ...userData } = data;
      
      // Verify Telegram Auth Hash (HMAC-SHA256)
      const encoder = new TextEncoder();
      const secretKeyHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(env.BOT_TOKEN));
      const hmacKey = await crypto.subtle.importKey(
        'raw', secretKeyHashBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );

      // Create data check string
      const dataCheckString = Object.keys(userData)
        .sort()
        .map(key => `${key}=${userData[key]}`)
        .join('\n');

      const signature = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString));
      const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (hexSignature !== hash) {
        return new Response(JSON.stringify({ error: 'Invalid authentication data' }), { status: 401, headers: corsHeaders });
      }

      // Check if user is admin in DB
      const telegramId = String(userData.id);
      const adminCheck = await env.DB.prepare("SELECT * FROM Employees WHERE telegram_id = ? AND role = 'admin'").bind(telegramId).first();
      
      if (!adminCheck) {
        return new Response(JSON.stringify({ error: 'User is not an admin in the HR system' }), { status: 403, headers: corsHeaders });
      }

      // Issue JWT
      const secret = new TextEncoder().encode(env.JWT_SECRET || env.BOT_TOKEN);
      const jwt = await new SignJWT({ id: telegramId, name: userData.first_name, role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      return new Response(JSON.stringify({ token: jwt, user: userData }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  // ── Authentication Middleware for Dashboard API ───────────────
  // We allow either JWT via Authorization header or API Key via X-API-KEY
  let isAuthenticated = false;
  let adminId = 0;
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = new TextEncoder().encode(env.JWT_SECRET || env.BOT_TOKEN);
      const decoded = await jwtVerify(token, secret);
      isAuthenticated = true;
      adminId = Number(decoded.payload.id || 0);
    } catch (err) {
      // invalid token
    }
  }

  const apiKeyHeader = request.headers.get('X-API-KEY');
  if (env.API_KEY && apiKeyHeader === env.API_KEY) {
    isAuthenticated = true;
  }

  if (!isAuthenticated) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }

  // ── Route Admin API Calls ──────────────────────────────────
  if (url.pathname.startsWith('/api/admin/')) {
    const adminResponse = await handleAdminRoutes(request, env, adminId);
    if (adminResponse) return adminResponse;
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
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // ── GET /api/employees ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/employees') {
    const result = await env.DB.prepare(
      "SELECT id, full_name, role, department, base_salary, telegram_id, is_active, created_at FROM Employees ORDER BY full_name"
    ).all();
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  // ── GET /api/attendance ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/attendance') {
    const limit = url.searchParams.get('limit') || '50';
    const result = await env.DB.prepare(`
      SELECT a.*, e.full_name 
      FROM Attendance a 
      JOIN Employees e ON a.employee_id = e.id 
      ORDER BY a.date DESC, a.check_in_time DESC 
      LIMIT ?
    `).bind(Number(limit)).all();
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── GET /api/export/employees ──────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/employees') {
    const { exportEmployeesExcel } = await import('./export');
    const res = await exportEmployeesExcel(env);
    const newRes = new Response(res.body, res);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    return newRes;
  }

  // ── GET /api/export/monthly ─────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/monthly') {
    const month = url.searchParams.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response('Invalid month parameter. Format must be YYYY-MM', { status: 400, headers: corsHeaders });
    }
    const { exportMonthlyReport } = await import('./export');
    const res = await exportMonthlyReport(env, month);
    const newRes = new Response(res.body, res);
    newRes.headers.set('Access-Control-Allow-Origin', '*');
    return newRes;
  }

  // ── GET /api/debug ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/debug') {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Return 404 for unknown API routes
  return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
}
