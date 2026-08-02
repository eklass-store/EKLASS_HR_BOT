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
  await env.DB.prepare(
    "INSERT INTO AuditLogs (admin_id, action, details) VALUES (?, ?, ?)"
  ).bind(adminId, action, details).run();
}
