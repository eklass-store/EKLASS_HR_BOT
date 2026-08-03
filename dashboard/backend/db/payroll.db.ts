// ============================================================
// src/db/payroll.db.ts — Payroll Database Operations
// ============================================================
import { Env, PayrollRecord } from '../types';

/** يصدر راتب موظف لشهر معين */
export async function issuePayroll(
  env: Env,
  employeeId: number,
  month: string,
  baseSalary: number,
  totalDeductions: number,
  netSalary: number
): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO Payroll (employee_id, month, base_salary, total_deductions, net_salary, status) VALUES (?, ?, ?, ?, ?, 'issued')"
  ).bind(employeeId, month, baseSalary, totalDeductions, netSalary).run();
  return result.meta.last_row_id as number;
}

/** آخر 6 رواتب للموظف */
export async function getEmployeePayroll(env: Env, employeeId: number): Promise<PayrollRecord[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Payroll WHERE employee_id = ? ORDER BY month DESC LIMIT 6"
  ).bind(employeeId).all();
  return result.results as unknown as PayrollRecord[];
}

/** هل صدر راتب هذا الشهر؟ — UNIQUE(employee_id, month) يحمي من الإدراج المكرر */
export async function hasPayrollForMonth(env: Env, employeeId: number, month: string): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT id FROM Payroll WHERE employee_id = ? AND month = ?"
  ).bind(employeeId, month).first();
  return !!result;
}
