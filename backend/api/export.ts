// ============================================================
// src/api/export.ts — Excel Export Endpoints
// ============================================================
import * as ExcelJS from 'exceljs';
import { Env } from '../types';
import { calculatePayroll } from '../utils/payroll';

export async function exportEmployeesExcel(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT e.id, e.telegram_id, e.full_name, e.role, e.base_salary, d.name as department_name, e.is_active, e.created_at FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id ORDER BY e.full_name LIMIT 5000"
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
    SELECT e.id, e.full_name, e.base_salary, p.total_deductions, p.total_bonuses, p.net_salary, p.status as payroll_status, p.is_confirmed, p.confirmed_at
    FROM Employees e
    LEFT JOIN Payroll p ON e.id = p.employee_id AND p.month = ?
    WHERE e.is_active = 1
    ORDER BY e.full_name
    LIMIT 5000
  `).bind(month).all();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Report ${month}`);

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'الاسم الكامل', key: 'full_name', width: 30 },
    { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'الإضافي', key: 'total_bonuses', width: 15 },
    { header: 'إجمالي الخصومات', key: 'total_deductions', width: 20 },
    { header: 'صافي الراتب', key: 'net_salary', width: 15 },
    { header: 'حالة الدفع', key: 'payroll_status', width: 15 },
    { header: 'حالة الاستلام', key: 'receipt_status', width: 20 }
  ];

  for (const row of result.results as any[]) {
    worksheet.addRow({
      id: row.id,
      full_name: row.full_name,
      base_salary: row.base_salary,
      total_bonuses: row.total_bonuses ?? 0,
      total_deductions: row.total_deductions ?? 0,
      net_salary: row.net_salary ?? row.base_salary,
      payroll_status: row.payroll_status === 'issued' ? 'تم الدفع' : (row.payroll_status ? 'معلق' : 'لم يصدر'),
      receipt_status: row.is_confirmed ? `تم الاستلام (${row.confirmed_at})` : (row.payroll_status === 'issued' ? 'في انتظار التأكيد' : '---')
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

export async function exportComprehensiveReport(env: Env, startDate: string, endDate: string): Promise<Response> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('التقرير الشامل');

  // Load Settings for calculations
  const { getSettings } = await import('../db/settings.db');
  const settings = await getSettings(env);
  const deductionRate = parseFloat(settings['late_deduction_per_minute'] ?? '1');
  const bonusRate = parseFloat(settings['overtime_bonus_per_minute'] ?? '1');
  const startTime = settings['work_start_time'] ?? '09:00';
  const endTime = settings['work_end_time'] ?? '17:00';
  const { calcLateMinutes } = await import('../utils/time');
  const workMinutes = calcLateMinutes(endTime, startTime) || 480;

  const startObj = new Date(startDate);
  const daysInMonth = new Date(startObj.getFullYear(), startObj.getMonth() + 1, 0).getDate();

  sheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'الاسم الكامل', key: 'full_name', width: 30 },
    { header: 'القسم', key: 'department_name', width: 20 },
    { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'أيام الحضور', key: 'present_days', width: 15 },
    { header: 'دقائق التأخير', key: 'late_minutes', width: 15 },
    { header: 'قيمة خصم التأخير', key: 'late_deduction', width: 15 },
    { header: 'دقائق الأوفر تايم', key: 'overtime_minutes', width: 15 },
    { header: 'مكافأة الأوفر تايم', key: 'overtime_bonus', width: 15 },
    { header: 'السلف المعتمدة (النشطة)', key: 'total_loans', width: 20 },
    { header: 'قيمة السلفة المخصومة', key: 'loan_deduction', width: 20 },
    { header: 'الراتب النهائي (الصافي)', key: 'net_salary', width: 20 }
  ];

  const empRes = await env.DB.prepare(
    "SELECT e.id, e.full_name, e.base_salary, d.name as department_name FROM Employees e LEFT JOIN Departments d ON e.department_id = d.id WHERE e.is_active = 1 ORDER BY e.full_name LIMIT 5000"
  ).all();

  // Fetch attendance aggregates
  const attRes = await env.DB.prepare(`
    SELECT employee_id, COUNT(id) as present_days, SUM(late_minutes) as late_minutes, SUM(overtime_minutes) as overtime_minutes
    FROM Attendance
    WHERE date >= ? AND date <= ?
    GROUP BY employee_id
    LIMIT 5000
  `).bind(startDate, endDate).all();
  
  const attMap = new Map((attRes.results as any[]).map(r => [r.employee_id, {
    present_days: r.present_days || 0,
    late_minutes: r.late_minutes || 0,
    overtime_minutes: r.overtime_minutes || 0
  }]));

  // Fetch ALL active loans (remaining_amount) regardless of creation date
  const activeLoansRes = await env.DB.prepare(`
    SELECT employee_id, SUM(remaining_amount) as total_loans
    FROM Loans
    WHERE status = 'approved'
    GROUP BY employee_id
    LIMIT 5000
  `).all();
  const loansMap = new Map((activeLoansRes.results as any[]).map(r => [r.employee_id, r.total_loans]));

  for (const emp of empRes.results as any[]) {
    const att = attMap.get(emp.id) || { present_days: 0, late_minutes: 0, overtime_minutes: 0 };
    const loansAmount = loansMap.get(emp.id) || 0;
    
    const base_salary = emp.base_salary || 0;
    
    const payroll = calculatePayroll({
      base_salary: base_salary,
      workMinutes,
      lateMinutes: att.late_minutes,
      overtimeMinutes: att.overtime_minutes,
      activeLoan: loansAmount,
      daysInMonth,
      deductionMultiplier: deductionRate,
      bonusMultiplier: bonusRate
    });

    sheet.addRow({
      id: emp.id,
      full_name: emp.full_name,
      department_name: emp.department_name ?? 'بدون قسم',
      base_salary: base_salary,
      present_days: att.present_days,
      late_minutes: att.late_minutes,
      late_deduction: payroll.lateDeduction,
      overtime_minutes: att.overtime_minutes,
      overtime_bonus: payroll.overtimeBonus,
      total_loans: loansAmount,
      loan_deduction: payroll.loanDeducted,
      net_salary: payroll.netSalary
    });
  }

  // Formatting styling
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

  const buffer = await workbook.xlsx.writeBuffer();
  
  return new Response(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Comprehensive_Report_${startDate}_${endDate}.xlsx"`,
    },
  });
}
