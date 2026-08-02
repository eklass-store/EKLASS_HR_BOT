// ============================================================
// src/db/loans.db.ts — Loans Database Operations
// ============================================================
import { Env, Loan } from '../types';

/** ينشئ طلب سلفة ويرجع ID مباشرة */
export async function createLoan(
  env: Env,
  employeeId: number,
  amount: number,
  reason: string
): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO Loans (employee_id, amount, reason, status) VALUES (?, ?, ?, 'pending')"
  ).bind(employeeId, amount, reason).run();
  return result.meta.last_row_id as number;
}

export async function getLoanById(env: Env, id: number): Promise<Loan | null> {
  return await env.DB.prepare(
    "SELECT * FROM Loans WHERE id = ?"
  ).bind(id).first() as Loan | null;
}

export async function updateLoanStatus(env: Env, id: number, status: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE Loans SET status = ? WHERE id = ?"
  ).bind(status, id).run();
}

/** آخر 5 سلف للموظف */
export async function getEmployeeLoans(env: Env, employeeId: number): Promise<Loan[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Loans WHERE employee_id = ? ORDER BY created_at DESC LIMIT 5"
  ).bind(employeeId).all();
  return result.results as unknown as Loan[];
}

/** هل للموظف سلفة معلقة؟ */
export async function hasPendingLoan(env: Env, employeeId: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT id FROM Loans WHERE employee_id = ? AND status = 'pending' LIMIT 1"
  ).bind(employeeId).first();
  return !!result;
}

/** مجموع السلف المعتمدة غير المسددة */
export async function getTotalActiveLoan(env: Env, employeeId: number): Promise<number> {
  const result = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM Loans WHERE employee_id = ? AND status = 'approved'"
  ).bind(employeeId).first() as any;
  return result?.total ?? 0;
}
