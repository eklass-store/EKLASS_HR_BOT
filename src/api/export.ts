// ============================================================
// src/api/export.ts — Excel Export Endpoints
// ============================================================
import * as xlsx from 'xlsx';
import { Env } from '../types';

export async function exportEmployeesExcel(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT id, telegram_id, full_name, role, base_salary, department, is_active, created_at FROM Employees ORDER BY full_name"
  ).all();
  
  const employees = result.results.map((e: any) => ({
    'ID': e.id,
    'Telegram ID': e.telegram_id,
    'الاسم الكامل': e.full_name,
    'الدور': e.role === 'admin' ? 'مدير' : 'موظف',
    'الراتب الأساسي': e.base_salary,
    'القسم': e.department ?? 'غير محدد',
    'الحالة': e.is_active ? 'نشط' : 'محذوف',
    'تاريخ التسجيل': e.created_at
  }));
  
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(employees);
  
  xlsx.utils.book_append_sheet(wb, ws, "Employees");
  
  // Generate buffer
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employees.xlsx"',
    },
  });
}
