// ============================================================
// src/api/routes.ts — REST API Endpoints with JWT & CORS
// ============================================================
import { Env } from '../types';
import { SignJWT, jwtVerify } from 'jose';
import { handleAdminRoutes } from './admin';

// Helper for CORS headers
const getCorsHeaders = (env: Env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY',
  'Vary': 'Origin',
});

let statsCache: any = null;
let statsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function handleApiRoutes(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    if (url.pathname.startsWith('/api/')) {
      return new Response(null, { headers: getCorsHeaders(env) });
    }
    return null;
  }

  if (!url.pathname.startsWith('/api/')) {
    return null;
  }

  // ── POST /api/auth/telegram ──────────────────────────────────
  if (request.method === 'POST' && url.pathname === '/api/auth/telegram') {
    try {
      const data = await request.json() as any;
      const { hash, ...userData } = data;
      
      // Prevent Replay Attacks: Check auth_date
      const authDate = Number(userData.auth_date);
      const now = Math.floor(Date.now() / 1000);
      if (!authDate || now - authDate > 86400) { // Max 24 hours old
        return new Response(JSON.stringify({ error: 'Authentication data is expired' }), { status: 401, headers: getCorsHeaders(env) });
      }

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
        return new Response(JSON.stringify({ error: 'Invalid authentication data' }), { status: 401, headers: getCorsHeaders(env) });
      }

      const nonceExists = await env.DB.prepare("SELECT hash FROM AuthNonces WHERE hash = ?").bind(hash).first();
      if (nonceExists) {
        return new Response(JSON.stringify({ error: 'Authentication payload already used' }), { status: 401, headers: getCorsHeaders(env) });
      }
      // Register hash as used
      await env.DB.prepare("INSERT INTO AuthNonces (hash) VALUES (?)").bind(hash).run();

      const telegramId = String(userData.id);
      const adminCheck = await env.DB.prepare("SELECT * FROM Employees WHERE telegram_id = ? AND role = 'admin' AND is_active = 1").bind(telegramId).first();
      
      if (!adminCheck) {
        return new Response(JSON.stringify({ error: 'User is not an admin in the HR system' }), { status: 403, headers: getCorsHeaders(env) });
      }

      // Issue JWT
      if (!env.JWT_SECRET) {
        return new Response(JSON.stringify({ error: 'Server misconfiguration: JWT_SECRET is missing' }), { status: 500, headers: getCorsHeaders(env) });
      }
      const secret = new TextEncoder().encode(env.JWT_SECRET);
      // Use internal employee ID instead of telegram_id
      const jwt = await new SignJWT({ id: adminCheck.id, name: userData.first_name, role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      return new Response(JSON.stringify({ token: jwt, user: userData }), {
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: getCorsHeaders(env) });
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
    try {
      const { hash } = await request.json() as { hash?: string };
      if (hash) {
        await env.DB.prepare("DELETE FROM AuthNonces WHERE hash = ?").bind(hash).run();
      }
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: getCorsHeaders(env) });
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
      if (!env.JWT_SECRET) throw new Error("JWT_SECRET missing");
      const secret = new TextEncoder().encode(env.JWT_SECRET);
      const decoded = await jwtVerify(token, secret);
      isAuthenticated = true;
      adminId = Number(decoded.payload.id || 0);
    } catch (err) {
      // invalid token
    }
  }

  const apiKeyHeader = request.headers.get('X-API-KEY');
  if (env.API_KEY && apiKeyHeader) {
    const encoder = new TextEncoder();
    const a = encoder.encode(env.API_KEY);
    const b = encoder.encode(apiKeyHeader);
    if (a.byteLength === b.byteLength) {
      let isEqual = 0;
      for (let i = 0; i < a.byteLength; i++) {
        isEqual |= a[i] ^ b[i];
      }
      if (isEqual === 0) {
        isAuthenticated = true;
      }
    }
  }

  if (!isAuthenticated) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) } 
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/webhook-info') {
    try {
      const tgUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`;
      const res = await fetch(tgUrl);
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) } });
    }
  }



  // ── POST /api/set-webhook (Requires Auth) ─────────────────────
  if (request.method === 'POST' && url.pathname === '/api/set-webhook') {
    const publicBase = (env.PUBLIC_APP_URL || 'https://challengawy-hr.pages.dev').replace(/\/$/, '');
    const webhookUrl = `${publicBase}/api/webhook`;
    let apiUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    if (env.WEBHOOK_SECRET) {
      apiUrl += `&secret_token=${env.WEBHOOK_SECRET}`;
    }
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify({ setting: webhookUrl, data }), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
    });
  }

  // ── Route Admin API Calls ──────────────────────────────────
  if (url.pathname.startsWith('/api/admin/')) {
    const adminResponse = await handleAdminRoutes(request, env, adminId);
    if (adminResponse) return adminResponse;
  }

  // ── GET /api/stats ─────────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/stats') {
    const now = Date.now();
    if (statsCache && (now - statsCacheTime) < CACHE_TTL) {
      return new Response(JSON.stringify(statsCache), { headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) } });
    }

    const [empCount, attCount, pendingLeaves, pendingLoans] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS c FROM Employees WHERE is_active = 1").first() as Promise<any>,
      env.DB.prepare("SELECT COUNT(*) AS c FROM Attendance").first() as Promise<any>,
      env.DB.prepare("SELECT COUNT(*) AS c FROM Leaves WHERE status = 'pending'").first() as Promise<any>,
      env.DB.prepare("SELECT COUNT(*) AS c FROM Loans WHERE status = 'pending'").first() as Promise<any>,
    ]);

    statsCache = {
      employees:        empCount?.c        ?? 0,
      attendance_records: attCount?.c      ?? 0,
      pending_leaves:   pendingLeaves?.c   ?? 0,
      pending_loans:    pendingLoans?.c    ?? 0,
    };
    statsCacheTime = now;

    return new Response(
      JSON.stringify(statsCache),
      { headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) } }
    );
  }

  // ── GET /api/employees ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/employees') {
    const result = await env.DB.prepare(
      "SELECT e.id, e.full_name, e.role, e.department_id, d.name as department_name, e.base_salary, e.telegram_id, e.is_active, e.created_at FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id ORDER BY e.full_name"
    ).all();
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
    });
  }

  // ── GET /api/departments ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/departments') {
    const result = await env.DB.prepare(
      "SELECT * FROM Departments ORDER BY name"
    ).all();
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
    });
  }

  // ── GET /api/attendance/daily ──────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/attendance/daily') {
    const date = url.searchParams.get('date'); // YYYY-MM-DD
    if (!date) {
      return new Response('Date parameter is required', { status: 400, headers: getCorsHeaders(env) });
    }

    const result = await env.DB.prepare(`
      SELECT 
        e.id as employee_id, 
        e.full_name, 
        d.name as department_name,
        a.id as attendance_id,
        a.check_in_time,
        a.check_out_time,
        a.late_minutes,
        a.overtime_minutes
      FROM Employees e
      LEFT JOIN Departments d ON e.department_id = d.id
      LEFT JOIN Attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.is_active = 1
      ORDER BY e.full_name
    `).bind(date).all();

    const records = result.results.map((r: any) => {
      let status = 'absent';
      if (r.attendance_id && r.check_in_time) {
        status = r.late_minutes > 0 ? 'late' : 'present';
      }
      return {
        ...r,
        status
      };
    });

    return new Response(JSON.stringify(records), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
    });
  }
  
  // ── GET /api/attendance ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/attendance') {
    const limitParam = url.searchParams.get('limit') || '50';
    const limit = Math.min(Number(limitParam), 500);
    const offset = Number(url.searchParams.get('offset') || '0');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    let result;
    if (startDate && endDate) {
      result = await env.DB.prepare(`
        SELECT a.*, e.full_name, e.department_id
        FROM Attendance a 
        JOIN Employees e ON a.employee_id = e.id 
        WHERE a.date >= ? AND a.date <= ?
        ORDER BY a.date ASC, a.check_in_time ASC
        LIMIT ? OFFSET ?
      `).bind(startDate, endDate, limit, offset).all();
    } else {
      result = await env.DB.prepare(`
        SELECT a.*, e.full_name, e.department_id
        FROM Attendance a 
        JOIN Employees e ON a.employee_id = e.id 
        ORDER BY a.date DESC, a.check_in_time DESC 
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();
    }
    
    // Add dynamic status (present, late)
    const records = result.results.map((r: any) => ({
      ...r,
      status: !r.check_in_time ? 'absent' : (r.late_minutes > 0 ? 'late' : 'present')
    }));

    return new Response(JSON.stringify(records), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
    });
  }

  // ── GET /api/export/employees ──────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/employees') {
    const { exportEmployeesExcel } = await import('./export');
    const res = await exportEmployeesExcel(env);
    const newRes = new Response(res.body, res);
    const corsHeaders = getCorsHeaders(env);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newRes.headers.set(key, value);
    }
    return newRes;
  }

  // ── GET /api/export/monthly ─────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/monthly') {
    const month = url.searchParams.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response('Invalid month parameter. Format must be YYYY-MM', { status: 400, headers: getCorsHeaders(env) });
    }
    const { exportMonthlyReport } = await import('./export');
    const res = await exportMonthlyReport(env, month);
    const newRes = new Response(res.body, res);
    const corsHeaders = getCorsHeaders(env);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newRes.headers.set(key, value);
    }
    return newRes;
  }

  // ── GET /api/export/comprehensive ──────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/export/comprehensive') {
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return new Response('Invalid date parameters. Both startDate and endDate are required in YYYY-MM-DD format', { status: 400, headers: getCorsHeaders(env) });
    }
    const { exportComprehensiveReport } = await import('./export');
    const res = await exportComprehensiveReport(env, startDate, endDate);
    const newRes = new Response(res.body, res);
    const corsHeaders = getCorsHeaders(env);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newRes.headers.set(key, value);
    }
    return newRes;
  }

  // ── GET /api/debug ─────────────────────────────────────
  if (request.method === 'GET' && url.pathname === '/api/debug') {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(env) },
    });
  }

  // Return 404 for unknown API routes
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: getCorsHeaders(env) });
}
