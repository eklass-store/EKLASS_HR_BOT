// ============================================================
// src/db/audit.db.ts — Audit Log Operations
// ============================================================
import { Env } from '../types';

export async function logAction(
  env: Env,
  adminId: number,
  action: string,
  details: string
): Promise<void> {
  // Audit Logs are disabled by user request to save space.
  console.log(`[Audit] Admin: ${adminId} | Action: ${action} | Details: ${details}`);
}

export async function getRecentAuditLogs(env: Env, limit: number = 10): Promise<any[]> {
  const res = await env.DB.prepare(
    `SELECT a.*, e.full_name as admin_name 
     FROM AuditLogs a 
     LEFT JOIN Employees e ON a.admin_id = e.id 
     ORDER BY a.created_at DESC LIMIT ?`
  ).bind(limit).all();
  return res.results;
}
