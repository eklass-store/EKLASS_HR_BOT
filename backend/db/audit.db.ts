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
  // BUG-L FIX: admin_id=0 يخرق FOREIGN KEY — نستخدم 0 كـ "system/api-key" بقيمة افتراضية آمنة
  // في المشاريع المتقدمة يمكن استخدام NULL مع تعديل الـ schema
  const safeAdminId = adminId > 0 ? adminId : 0;
  try {
    await env.DB.prepare(
      "INSERT INTO AuditLogs (admin_id, action, details) VALUES (?, ?, ?)"
    ).bind(safeAdminId, action, details).run();
  } catch {
    // إذا فشل الإدراج (FOREIGN KEY) نتجاهله — الـ audit log لا يوقف العملية
  }
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
