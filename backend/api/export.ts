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

export async function exportComprehensiveReport(env: Env, month: string): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  
  // ── Sheet 1: Employees ──
  const empSheet = workbook.addWorksheet('الموظفين');
  empSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'الاسم الكامل', key: 'full_name', width: 30 },
    { header: 'الدور', key: 'role', width: 15 },
    { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'القسم', key: 'department_name', width: 20 },
    { header: 'الحالة', key: 'is_active', width: 15 }
  ];
  const empRes = await env.DB.prepare(
    "SELECT e.id, e.full_name, e.role, e.base_salary, d.name as department_name, e.is_active FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id ORDER BY e.full_name"
  ).all();
  for (const e of empRes.results as any[]) {
    empSheet.addRow({
      id: e.id,
      full_name: e.full_name,
      role: e.role === 'admin' ? 'مدير' : 'موظف',
      base_salary: e.base_salary,
      department_name: e.department_name ?? 'غير محدد',
      is_active: e.is_active ? 'نشط' : 'غير نشط'
    });
  }

  // ── Sheet 2: Attendance & Leaves ──
  const attSheet = workbook.addWorksheet('الحضور والإجازات');
  attSheet.columns = [
    { header: 'الموظف', key: 'full_name', width: 30 },
    { header: 'أيام الحضور', key: 'present_days', width: 15 },
    { header: 'أيام الغياب', key: 'absent_days', width: 15 },
    { header: 'إجمالي دقائق التأخير', key: 'total_late_minutes', width: 20 },
    { header: 'الإجازات المقبولة', key: 'approved_leaves', width: 20 }
  ];
  
  const attRes = await env.DB.prepare(`
    SELECT 
      e.id, 
      e.full_name,
      COUNT(a.id) as present_days,
      SUM(a.late_minutes) as total_late_minutes
    FROM Employees e
    LEFT JOIN Attendance a ON e.id = a.employee_id AND a.date LIKE ? || '%'
    WHERE e.is_active = 1
    GROUP BY e.id
  `).bind(month).all();

  const leavesRes = await env.DB.prepare(`
    SELECT employee_id, COUNT(id) as leaves_count 
    FROM Leaves 
    WHERE start_date LIKE ? || '%' AND status = 'approved'
    GROUP BY employee_id
  `).bind(month).all();
  const leavesMap = new Map((leavesRes.results as any[]).map(r => [r.employee_id, r.leaves_count]));

  for (const r of attRes.results as any[]) {
    const present = r.present_days || 0;
    const expected = 26; // Assuming 26 working days (excluding Fridays)
    const absent = present < expected ? expected - present : 0;
    
    attSheet.addRow({
      full_name: r.full_name,
      present_days: present,
      absent_days: absent,
      total_late_minutes: r.total_late_minutes || 0,
      approved_leaves: leavesMap.get(r.id) || 0
    });
  }

  // ── Sheet 3: Salaries & Loans ──
  const salSheet = workbook.addWorksheet('الرواتب والسلف');
  salSheet.columns = [
    { header: 'الموظف', key: 'full_name', width: 30 },
    { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'إجمالي السلف المستقطعة', key: 'total_loans', width: 20 },
    { header: 'صافي الراتب المتوقع', key: 'net_salary', width: 20 },
    { header: 'حالة الدفع الفعلية', key: 'payroll_status', width: 20 }
  ];

  const payrollRes = await env.DB.prepare(`
    SELECT e.id, e.full_name, e.base_salary, p.total_deductions, p.net_salary, p.status as payroll_status
    FROM Employees e
    LEFT JOIN Payroll p ON e.id = p.employee_id AND p.month = ?
    WHERE e.is_active = 1
    ORDER BY e.full_name
  `).bind(month).all();

  const loansRes = await env.DB.prepare(`
    SELECT employee_id, SUM(amount) as total_amount 
    FROM Loans 
    WHERE created_at LIKE ? || '%' AND status = 'approved'
    GROUP BY employee_id
  `).bind(month).all();
  const loansMap = new Map((loansRes.results as any[]).map(r => [r.employee_id, r.total_amount]));

  for (const row of payrollRes.results as any[]) {
    const loans = loansMap.get(row.id) || 0;
    salSheet.addRow({
      full_name: row.full_name,
      base_salary: row.base_salary,
      total_loans: loans,
      net_salary: row.net_salary ?? (row.base_salary - loans), // Estimate if not issued yet
      payroll_status: row.payroll_status === 'issued' ? 'تم الدفع' : (row.payroll_status ? 'معلق' : 'لم يصدر')
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Comprehensive_Report_${month}.xlsx"`,
    },
  });
}
