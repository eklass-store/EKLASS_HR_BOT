// ============================================================
// src/api/export.ts — Excel Export Endpoints
// ============================================================
import * as ExcelJS from 'exceljs';
import { Env } from '../types';

export async function exportEmployeesExcel(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT e.id, e.telegram_id, e.full_name, e.role, e.base_salary, d.name as department_name, e.is_active, e.created_at FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id ORDER BY e.full_name"
  ).all();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Employees');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Telegram ID', key: 'telegram_id', width: 20 },
    { header: 'الاسم الكامل', key: 'full_name', width: 30 },
    { header: 'الدور', key: 'role', width: 15 },
    { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'القسم', key: 'department_name', width: 20 },
    { header: 'الحالة', key: 'is_active', width: 15 },
    { header: 'تاريخ التسجيل', key: 'created_at', width: 20 }
  ];

  for (const e of result.results as any[]) {
    worksheet.addRow({
      id: e.id,
      telegram_id: e.telegram_id,
      full_name: e.full_name,
      role: e.role === 'admin' ? 'مدير' : 'موظف',
      base_salary: e.base_salary,
      department_name: e.department_name ?? 'غير محدد',
      is_active: e.is_active ? 'نشط' : 'محذوف',
      created_at: e.created_at
    });
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employees.xlsx"',
    },
  });
}

export async function exportMonthlyReport(env: Env, month: string): Promise<Response> {
  const result = await env.DB.prepare(`
    SELECT e.id, e.full_name, e.base_salary, p.total_deductions, p.net_salary, p.status as payroll_status
    FROM Employees e
    LEFT JOIN Payroll p ON e.id = p.employee_id AND p.month = ?
    WHERE e.is_active = 1
    ORDER BY e.full_name
  `).bind(month).all();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Report ${month}`);

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'الاسم الكامل', key: 'full_name', width: 30 },
    { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'إجمالي الخصومات', key: 'total_deductions', width: 20 },
    { header: 'صافي الراتب', key: 'net_salary', width: 15 },
    { header: 'حالة الدفع', key: 'payroll_status', width: 15 }
  ];

  for (const row of result.results as any[]) {
    worksheet.addRow({
      id: row.id,
      full_name: row.full_name,
      base_salary: row.base_salary,
      total_deductions: row.total_deductions ?? 0,
      net_salary: row.net_salary ?? row.base_salary,
      payroll_status: row.payroll_status === 'issued' ? 'تم الدفع' : (row.payroll_status ? 'معلق' : 'لم يصدر')
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report_${month}.xlsx"`,
    },
  });
}
