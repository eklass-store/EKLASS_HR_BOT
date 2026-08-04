import { Env, Department } from '../types';

export async function getAllDepartments(env: Env): Promise<Department[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM Departments ORDER BY name"
  ).all();
  return result.results as unknown as Department[];
}

export async function getDepartmentById(env: Env, id: number): Promise<Department | null> {
  return await env.DB.prepare(
    "SELECT * FROM Departments WHERE id = ?"
  ).bind(id).first() as Department | null;
}

export async function addDepartment(env: Env, name: string, managerId: number | null = null): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO Departments (name, manager_id) VALUES (?, ?)"
  ).bind(name, managerId).run();
  return result.meta.last_row_id as number;
}

export async function updateDepartment(env: Env, id: number, name: string, managerId: number | null = null): Promise<void> {
  await env.DB.prepare(
    "UPDATE Departments SET name = ?, manager_id = ? WHERE id = ?"
  ).bind(name, managerId, id).run();
}

export async function deleteDepartment(env: Env, id: number): Promise<void> {
  // Option: move employees to unassigned
  await env.DB.prepare("UPDATE Employees SET department_id = NULL WHERE department_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM Departments WHERE id = ?").bind(id).run();
}
