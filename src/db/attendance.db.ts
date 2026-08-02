// ============================================================
// src/db/attendance.db.ts — Attendance Database Operations
// FIX BUG-01: فحص مسبق + UNIQUE constraint في DB
// FIX BUG-08: checkout يستهدف السجل الصحيح
// ============================================================
import { Env, AttendanceRecord, DailyAttendanceRow } from '../types';

/** يجلب سجل الحضور لموظف في يوم معين */
export async function getTodayAttendance(
  env: Env,
  employeeId: number,
  date: string
): Promise<AttendanceRecord | null> {
  return await env.DB.prepare(
    "SELECT * FROM Attendance WHERE employee_id = ? AND date = ?"
  ).bind(employeeId, date).first() as AttendanceRecord | null;
}

/** يُسجّل حضور موظف — UNIQUE constraint يمنع التكرار من DB */
export async function createAttendance(
  env: Env,
  employeeId: number,
  date: string,
  checkInTime: string | null,
  lateMinutes: number
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO Attendance (employee_id, date, check_in_time, late_minutes) VALUES (?, ?, ?, ?)"
  ).bind(employeeId, date, checkInTime, lateMinutes).run();
}

/**
 * يُسجّل وقت الانصراف — FIX BUG-08: يستهدف السجل الذي ليس لديه check_out بعد
 * يرجع عدد السجلات المحدّثة
 */
export async function recordCheckout(
  env: Env,
  employeeId: number,
  date: string,
  checkOutTime: string
): Promise<number> {
  const result = await env.DB.prepare(
    "UPDATE Attendance SET check_out_time = ? WHERE employee_id = ? AND date = ? AND check_out_time IS NULL"
  ).bind(checkOutTime, employeeId, date).run();
  return result.meta.changes;
}

/** سجل الحضور الشهري لموظف */
export async function getAttendanceHistory(
  env: Env,
  employeeId: number,
  month: string
): Promise<AttendanceRecord[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Attendance WHERE employee_id = ? AND date LIKE ? ORDER BY date DESC"
  ).bind(employeeId, `${month}%`).all();
  return result.results as unknown as AttendanceRecord[];
}

/** تقرير الحضور اليومي لجميع الموظفين (للأدمن) */
export async function getDailyReport(
  env: Env,
  date: string
): Promise<DailyAttendanceRow[]> {
  const result = await env.DB.prepare(`
    SELECT
      e.full_name,
      a.check_in_time,
      a.check_out_time,
      COALESCE(a.late_minutes, 0) AS late_minutes
    FROM Employees e
    LEFT JOIN Attendance a ON e.id = a.employee_id AND a.date = ?
    WHERE e.is_active = 1
    ORDER BY e.full_name
  `).bind(date).all();
  return result.results as unknown as DailyAttendanceRow[];
}

/** إجمالي دقائق التأخير لموظف في شهر معين */
export async function getTotalLateMinutes(
  env: Env,
  employeeId: number,
  month: string
): Promise<number> {
  const result = await env.DB.prepare(
    "SELECT COALESCE(SUM(late_minutes), 0) AS total FROM Attendance WHERE employee_id = ? AND date LIKE ?"
  ).bind(employeeId, `${month}%`).first() as any;
  return result?.total ?? 0;
}
