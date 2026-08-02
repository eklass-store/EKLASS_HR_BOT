// ============================================================
// src/db/leaves.db.ts — Leaves Database Operations
// ============================================================
import { Env, Leave } from '../types';

/** ينشئ طلب إجازة ويرجع الـ ID مباشرة (FIX BUG-04) */
export async function createLeave(
  env: Env,
  employeeId: number,
  startDate: string,
  endDate: string,
  type: string,
  reason: string
): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO Leaves (employee_id, start_date, end_date, type, status, reason) VALUES (?, ?, ?, ?, 'pending', ?)"
  ).bind(employeeId, startDate, endDate, type, reason).run();
  return result.meta.last_row_id as number; // FIX BUG-04: last_row_id بدل SELECT آخر ID
}

export async function getLeaveById(env: Env, id: number): Promise<Leave | null> {
  return await env.DB.prepare(
    "SELECT * FROM Leaves WHERE id = ?"
  ).bind(id).first() as Leave | null;
}

/** يحدّث حالة الإجازة (approved | rejected) */
export async function updateLeaveStatus(env: Env, id: number, status: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE Leaves SET status = ? WHERE id = ?"
  ).bind(status, id).run();
}

/** آخر 10 إجازات للموظف */
export async function getEmployeeLeaves(env: Env, employeeId: number): Promise<Leave[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Leaves WHERE employee_id = ? ORDER BY created_at DESC LIMIT 10"
  ).bind(employeeId).all();
  return result.results as unknown as Leave[];
}

/** رصيد الإجازات للسنة الحالية */
export async function getLeaveBalance(
  env: Env,
  employeeId: number
): Promise<{ approved: number; pending: number }> {
  const year = new Date().getFullYear().toString();

  const approved = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM Leaves WHERE employee_id = ? AND status = 'approved' AND start_date LIKE ?"
  ).bind(employeeId, `${year}%`).first() as any;

  const pending = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM Leaves WHERE employee_id = ? AND status = 'pending'"
  ).bind(employeeId).first() as any;

  return { approved: approved?.c ?? 0, pending: pending?.c ?? 0 };
}

/** هل للموظف طلب معلق؟ — لمنع التكرار */
export async function hasPendingLeave(env: Env, employeeId: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT id FROM Leaves WHERE employee_id = ? AND status = 'pending' LIMIT 1"
  ).bind(employeeId).first();
  return !!result;
}
