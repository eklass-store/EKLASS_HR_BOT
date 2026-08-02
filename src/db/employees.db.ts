// ============================================================
// src/db/employees.db.ts — Employee Database Operations
// ============================================================
import { Env, Employee } from '../types';

export async function getEmployeeByTelegramId(env: Env, telegramId: string): Promise<Employee | null> {
  return await env.DB.prepare(
    "SELECT * FROM Employees WHERE telegram_id = ? AND is_active = 1"
  ).bind(telegramId).first() as Employee | null;
}

export async function getEmployeeById(env: Env, id: number): Promise<Employee | null> {
  return await env.DB.prepare(
    "SELECT * FROM Employees WHERE id = ? AND is_active = 1"
  ).bind(id).first() as Employee | null;
}

export async function getAllEmployees(env: Env): Promise<Employee[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Employees WHERE is_active = 1 ORDER BY full_name"
  ).all();
  return result.results as unknown as Employee[];
}

export async function getAdmins(env: Env): Promise<Employee[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Employees WHERE role = 'admin' AND is_active = 1"
  ).all();
  return result.results as unknown as Employee[];
}

export async function addEmployee(
  env: Env,
  telegramId: string,
  fullName: string,
  baseSalary: number,
  role: 'admin' | 'employee' = 'employee'
): Promise<number> {
  // Check if an employee (active or inactive) already exists with this telegramId
  const existing = await env.DB.prepare(
    "SELECT id FROM Employees WHERE telegram_id = ?"
  ).bind(telegramId).first() as { id: number } | null;

  if (existing) {
    // Reactivate and update their info
    await env.DB.prepare(
      "UPDATE Employees SET full_name = ?, base_salary = ?, role = ?, is_active = 1 WHERE id = ?"
    ).bind(fullName, baseSalary, role, existing.id).run();
    return existing.id;
  } else {
    // Insert new employee
    const result = await env.DB.prepare(
      "INSERT INTO Employees (telegram_id, full_name, base_salary, role) VALUES (?, ?, ?, ?)"
    ).bind(telegramId, fullName, baseSalary, role).run();
    return result.meta.last_row_id as number;
  }
}

export async function updateEmployeeSalary(env: Env, id: number, salary: number): Promise<void> {
  await env.DB.prepare(
    "UPDATE Employees SET base_salary = ? WHERE id = ?"
  ).bind(salary, id).run();
}

/** Soft delete — لا نحذف البيانات التاريخية */
export async function softDeleteEmployee(env: Env, id: number): Promise<void> {
  await env.DB.prepare(
    "UPDATE Employees SET is_active = 0 WHERE id = ?"
  ).bind(id).run();
}

export async function updateEmployeeRole(env: Env, id: number, role: 'admin' | 'employee'): Promise<void> {
  await env.DB.prepare(
    "UPDATE Employees SET role = ? WHERE id = ?"
  ).bind(role, id).run();
}
