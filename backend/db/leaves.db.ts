// ============================================================
// src/db/leaves.db.ts — Leaves Database Operations
// ============================================================
import { Env, Leave } from '../types';

/** ينشئ طلب إجازة ويرجع الـ ID مباشرة (FIX BUG-04) */
export async function createLeave(env: Env, employeeId: number, startDate: string, endDate: string, type: string, reason: string): Promise<number | null> {
  const result = await env.DB.prepare(`
    INSERT INTO Leaves (employee_id, start_date, end_date, type, status, reason)
    SELECT ?, ?, ?, ?, 'pending', ?
    WHERE NOT EXISTS (
      SELECT 1 FROM Leaves 
      WHERE employee_id = ? AND status != 'rejected' AND (start_date <= ? AND end_date >= ?)
    )
  `).bind(employeeId, startDate, endDate, type, reason, employeeId, endDate, startDate).run();
  
  if (result.meta && result.meta.changes > 0) {
    return result.meta.last_row_id as number;
  }
  return null;
}

export async function getLeaveById(env: Env, id: number): Promise<Leave | null> {
  return await env.DB.prepare(
    "SELECT * FROM Leaves WHERE id = ?"
  ).bind(id).first() as Leave | null;
}

export async function updateLeaveStatus(env: Env, id: number, status: string, approvedBy: number | null = null): Promise<void> {
  if (approvedBy !== null) {
    await env.DB.prepare(
      "UPDATE Leaves SET status = ?, approved_by = ? WHERE id = ?"
    ).bind(status, approvedBy, id).run();
  } else {
    await env.DB.prepare(
      "UPDATE Leaves SET status = ? WHERE id = ?"
    ).bind(status, id).run();
  }
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
): Promise<{ approved: number; pending: number; quota: number; monthlyQuota: number; monthlyApproved: number; monthlyPending: number }> {
  const year = new Date().getFullYear().toString();

  const approved = await env.DB.prepare(
    "SELECT CAST(SUM(julianday(end_date) - julianday(start_date) + 1) AS INTEGER) AS c FROM Leaves WHERE employee_id = ? AND status = 'approved' AND start_date LIKE ?"
  ).bind(employeeId, `${year}%`).first() as any;

  const pending = await env.DB.prepare(
    "SELECT CAST(SUM(julianday(end_date) - julianday(start_date) + 1) AS INTEGER) AS c FROM Leaves WHERE employee_id = ? AND status = 'pending' AND start_date LIKE ?"
  ).bind(employeeId, `${year}%`).first() as any;

  // Get quota from settings
  const { getSettings } = await import('./settings.db');
  const settings = await getSettings(env);
  const baseQuota = parseInt(settings['annual_leave_quota'] ?? '21');
  const monthlyQuota = Math.max(0, parseInt(settings['monthly_paid_leave_days'] ?? '2'));
  const month = new Date().toISOString().slice(0, 7);
  const monthlyApprovedRow = await env.DB.prepare(
    "SELECT CAST(SUM(julianday(end_date) - julianday(start_date) + 1) AS INTEGER) AS c FROM Leaves WHERE employee_id = ? AND status = 'approved' AND start_date LIKE ?"
  ).bind(employeeId, month + '%').first() as any;
  const monthlyPendingRow = await env.DB.prepare(
    "SELECT CAST(SUM(julianday(end_date) - julianday(start_date) + 1) AS INTEGER) AS c FROM Leaves WHERE employee_id = ? AND status = 'pending' AND start_date LIKE ?"
  ).bind(employeeId, month + '%').first() as any;

  // مكافأة إجازات اختيارية: كل شهر تجاوز فيه الحضور الحد ولم تُستخدم إجازة معتمدة.
  const threshold = Math.max(0, parseInt(settings['attendance_bonus_threshold_days'] ?? '15'));
  const bonusDays = Math.max(0, parseInt(settings['attendance_bonus_leave_days'] ?? '4'));
  const attendanceMonths = await env.DB.prepare(
    "SELECT strftime('%Y-%m', date) AS month, COUNT(*) AS days FROM Attendance WHERE employee_id = ? AND date LIKE ? AND check_in_time IS NOT NULL GROUP BY strftime('%Y-%m', date)"
  ).bind(employeeId, year + '%').all();
  const usedLeaveMonths = await env.DB.prepare(
    "SELECT DISTINCT substr(start_date, 1, 7) AS month FROM Leaves WHERE employee_id = ? AND status = 'approved' AND start_date LIKE ?"
  ).bind(employeeId, year + '%').all();
  const usedMonths = new Set((usedLeaveMonths.results as any[]).map(r => String(r.month)));
  const bonusMonths = (attendanceMonths.results as any[]).filter(r => Number(r.days || 0) > threshold && !usedMonths.has(String(r.month))).length;
  const quota = baseQuota + (bonusMonths * bonusDays);

  return {
    approved: approved?.c ?? 0,
    pending: pending?.c ?? 0,
    quota,
    monthlyQuota,
    monthlyApproved: monthlyApprovedRow?.c ?? 0,
    monthlyPending: monthlyPendingRow?.c ?? 0
  };
}

/** هل للموظف طلب معلق؟ — لمنع التكرار */
export async function hasPendingLeave(env: Env, employeeId: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT id FROM Leaves WHERE employee_id = ? AND status = 'pending' LIMIT 1"
  ).bind(employeeId).first();
  return !!result;
}

/** هل تتداخل التواريخ مع إجازة أخرى معتمدة أو معلقة؟ */
export async function hasOverlappingLeave(env: Env, employeeId: number, startDate: string, endDate: string): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT id FROM Leaves WHERE employee_id = ? AND status IN ('approved', 'pending') AND (start_date <= ? AND end_date >= ?) LIMIT 1"
  ).bind(employeeId, endDate, startDate).first();
  return !!result;
}
