// ============================================================
// src/db/employees.db.ts — Employee Database Operations
// ============================================================
import { Env, Employee } from '../types';

export async function getEmployeeByTelegramId(env: Env, telegramId: string): Promise<Employee | null> {
  return await env.DB.prepare(
    "SELECT e.*, d.name as department_name FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id WHERE e.telegram_id = ? AND e.is_active = 1"
  ).bind(telegramId).first() as Employee | null;
}

export async function getEmployeeById(env: Env, id: number, includeInactive: boolean = false): Promise<Employee | null> {
  const query = includeInactive 
    ? "SELECT e.*, d.name as department_name FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id WHERE e.id = ?"
    : "SELECT e.*, d.name as department_name FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id WHERE e.id = ? AND e.is_active = 1";
  return await env.DB.prepare(query).bind(id).first() as Employee | null;
}

export async function getAllEmployees(env: Env): Promise<Employee[]> {
  const result = await env.DB.prepare(
    "SELECT e.*, d.name as department_name FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id WHERE e.is_active = 1 ORDER BY e.full_name"
  ).all();
  return result.results as unknown as Employee[];
}

export async function getAdmins(env: Env): Promise<Employee[]> {
  const result = await env.DB.prepare(
    "SELECT e.*, d.name as department_name FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id WHERE e.role = 'admin' AND e.is_active = 1"
  ).all();
  return result.results as unknown as Employee[];
}

export async function addEmployee(
  env: Env,
  telegramId: string,
  fullName: string,
  baseSalary: number,
  departmentId: number | null,
  role: 'admin' | 'employee' = 'employee'
): Promise<number> {
  // Check if an employee (active or inactive) already exists with this telegramId
  const existing = await env.DB.prepare(
    "SELECT id FROM Employees WHERE telegram_id = ?"
  ).bind(telegramId).first() as { id: number } | null;

  if (existing) {
    // Reactivate and update their info
    await env.DB.prepare(
      "UPDATE Employees SET full_name = ?, base_salary = ?, department_id = ?, role = ?, is_active = 1 WHERE id = ?"
    ).bind(fullName, baseSalary, departmentId, role, existing.id).run();
    return existing.id;
  } else {
    // Insert new employee
    const result = await env.DB.prepare(
      "INSERT INTO Employees (telegram_id, full_name, base_salary, department_id, role) VALUES (?, ?, ?, ?, ?)"
    ).bind(telegramId, fullName, baseSalary, departmentId, role).run();
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
  // جلب الموظف أولاً لمعرفة telegram_id
  const emp = await env.DB.prepare("SELECT telegram_id FROM Employees WHERE id = ?").bind(id).first() as { telegram_id: string } | null;
  
  await env.DB.prepare(
    "UPDATE Employees SET is_active = 0 WHERE id = ?"
  ).bind(id).run();

  // BUG-B FIX: حذف حالة المحادثة النشطة حتى لا يكمل طلباته بعد التعطيل
  if (emp?.telegram_id) {
    await env.DB.prepare(
      "DELETE FROM ConversationState WHERE telegram_id = ?"
    ).bind(emp.telegram_id).run();
  }
}

export async function updateEmployeeRole(env: Env, id: number, role: 'admin' | 'employee'): Promise<void> {
  await env.DB.prepare(
    "UPDATE Employees SET role = ? WHERE id = ?"
  ).bind(role, id).run();
}
