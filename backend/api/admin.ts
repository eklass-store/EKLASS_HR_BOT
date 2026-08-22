import { Env } from '../types';
import { addEmployee, updateEmployeeSalary, updateEmployeeRole, softDeleteEmployee, getEmployeeById, getAllEmployees } from '../db/employees.db';
import { updateLeaveStatus, getLeaveById } from '../db/leaves.db';
import { updateLoanStatus, getLoanById } from '../db/loans.db';
import { getSettings, updateSetting } from '../db/settings.db';
import { addHoliday, removeHoliday } from '../db/holidays.db';
import { createAnnouncement } from '../db/announcements.db';
import { logAction } from '../db/audit.db';
import { hasPayrollForMonth } from '../db/payroll.db';
import { getTotalLateMinutes } from '../db/attendance.db';

import { getDaysInMonth, calcLateMinutes, diffMinutes, isValidDate, isWeekend } from '../utils/time';
import { escapeMarkdown } from '../utils/markdown';
import { calculatePayroll } from '../utils/payroll';

// ── Interfaces ───────────────────────────────────────────────
interface AddEmployeeReq { telegram_id: string; full_name: string; base_salary?: number; department_id?: number; role?: string; }
interface UpdateEmployeeReq { base_salary?: number; role?: string; is_active?: boolean; full_name?: string; department_id?: number; telegram_id?: string; }
interface MessageReq { message: string; }
interface DepartmentReq { name: string; manager_id?: number; }
interface StatusReq { status: string; }
interface SettingReq { key: string; value: string | number | boolean; }
interface HolidayReq { date: string; description?: string; }
interface PayrollReq { month: string; }
// ─────────────────────────────────────────────────────────────

// Helper for CORS headers
const getCorsHeaders = (env: Env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY',
  'Vary': 'Origin',
});

const jsonResponse = (data: any, status = 200, env?: Env) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(env ? getCorsHeaders(env) : { 'Access-Control-Allow-Origin': '*' }),
    },
  });
};

export async function handleAdminRoutes(
  request: Request,
  env: Env,
  adminId: number
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ── Employees ────────────────────────────────────────────────
  if (path === '/api/admin/employees') {
    if (method === 'POST') {
      const data = await request.json() as AddEmployeeReq;
      if (!data.telegram_id || !data.full_name) return jsonResponse({ error: 'Missing fields' }, 400, env);
      if (typeof data.telegram_id !== 'string' || data.telegram_id.length > 30 || !/^\d+$/.test(data.telegram_id)) {
        return jsonResponse({ error: 'Invalid telegram_id' }, 400, env);
      }
      if (typeof data.full_name !== 'string' || data.full_name.length > 100 || data.full_name.length < 2) {
        return jsonResponse({ error: 'Invalid full_name' }, 400, env);
      }
      const salary = Number(data.base_salary) || 0;
      if (isNaN(salary) || salary < 0) {
        return jsonResponse({ error: 'Invalid base_salary' }, 400, env);
      }
      try {
        const id = await addEmployee(env, data.telegram_id, data.full_name, data.base_salary || 0, data.department_id || null, data.role || 'employee');
        await logAction(env, adminId, 'ADD_EMPLOYEE', `Added employee ${data.full_name}`);
        return jsonResponse({ success: true, id }, 200, env);
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500, env);
      }
    }
  }

  const empMessageMatch = path.match(/^\/api\/admin\/employees\/(\d+)\/message$/);
  if (empMessageMatch && method === 'POST') {
    const empId = parseInt(empMessageMatch[1]);
    const data = await request.json() as MessageReq;
    if (!data.message) return jsonResponse({ error: 'Message required' }, 400, env);
    
    const emp = await getEmployeeById(env, empId, true);
    if (!emp) return jsonResponse({ error: 'Not found' }, 404, env);
    
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: emp.telegram_id,
        text: `📩 *رسالة من الإدارة:*\n\n${escapeMarkdown(data.message)}`,
        parse_mode: 'Markdown'
      })
    });
    
    if (!res.ok) return jsonResponse({ error: 'Failed to send message via Telegram' }, 500, env);
    await logAction(env, adminId, 'SEND_MESSAGE', `Sent message to employee ID ${empId}`);
    return jsonResponse({ success: true }, 200, env);
  }

  const empMatch = path.match(/^\/api\/admin\/employees\/(\d+)$/);
  if (empMatch) {
    const empId = parseInt(empMatch[1]);
    if (method === 'GET') {
      const emp = await getEmployeeById(env, empId, true);
      if (!emp) return jsonResponse({ error: 'Not found' }, 404, env);
      
      const [attendance, leaves, loans] = await Promise.all([
        env.DB.prepare("SELECT * FROM Attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 30").bind(empId).all(),
        env.DB.prepare("SELECT * FROM Leaves WHERE employee_id = ? ORDER BY created_at DESC LIMIT 20").bind(empId).all(),
        env.DB.prepare("SELECT * FROM Loans WHERE employee_id = ? ORDER BY created_at DESC LIMIT 20").bind(empId).all(),
      ]);

      return jsonResponse({
        ...emp,
        attendance: attendance.results,
        leaves: leaves.results,
        loans: loans.results
      }, 200, env);
    }
    if (method === 'PUT') {
      const data = await request.json() as UpdateEmployeeReq;
      if (data.base_salary !== undefined) {
        const salary = Number(data.base_salary);
        if (isNaN(salary) || salary < 0) return jsonResponse({ error: 'Invalid base_salary' }, 400, env);
        await updateEmployeeSalary(env, empId, salary);
      }
      if (data.role !== undefined) {
        if (!['admin', 'employee'].includes(data.role)) return jsonResponse({ error: 'Invalid role' }, 400, env);
        await updateEmployeeRole(env, empId, data.role);
      }
      
      const updates = [];
      const params = [];
      if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(data.is_active ? 1 : 0);
      }
      if (data.full_name) {
        if (typeof data.full_name !== 'string' || data.full_name.length < 2 || data.full_name.length > 100) return jsonResponse({ error: 'Invalid full_name' }, 400, env);
        updates.push('full_name = ?');
        params.push(data.full_name);
      }
      if (data.department_id !== undefined) {
        updates.push('department_id = ?');
        params.push(data.department_id || null);
      }
      
      if (updates.length > 0) {
        params.push(empId);
        await env.DB.prepare(`UPDATE Employees SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
      }
      await logAction(env, adminId, 'UPDATE_EMPLOYEE', `Updated employee ID ${empId}`);
      return jsonResponse({ success: true }, 200, env);
    }
    if (method === 'DELETE') {
      await softDeleteEmployee(env, empId);
      await logAction(env, adminId, 'DELETE_EMPLOYEE', `Soft deleted employee ID ${empId}`);
      return jsonResponse({ success: true }, 200, env);
    }
  }

  // ── Departments ──────────────────────────────────────────────
  if (path === '/api/admin/departments') {
    if (method === 'POST') {
      try {
        const data = await request.json() as DepartmentReq;
        if (!data.name) return jsonResponse({ error: 'Missing name' }, 400, env);
        const { addDepartment } = await import('../db/departments.db');
        const id = await addDepartment(env, data.name, data.manager_id || null);
        await logAction(env, adminId, 'ADD_DEPARTMENT', `Added department ${data.name}`);
        return jsonResponse({ success: true, id }, 200, env);
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500, env);
      }
    }
  }

  const deptMatch = path.match(/^\/api\/admin\/departments\/(\d+)$/);
  if (deptMatch) {
    const deptId = parseInt(deptMatch[1]);
    if (method === 'PUT') {
      try {
        const data = await request.json() as DepartmentReq;
        if (!data.name) return jsonResponse({ error: 'Missing name' }, 400, env);
        const { updateDepartment } = await import('../db/departments.db');
        await updateDepartment(env, deptId, data.name, data.manager_id || null);
        await logAction(env, adminId, 'UPDATE_DEPARTMENT', `Updated department ID ${deptId}`);
        return jsonResponse({ success: true }, 200, env);
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500, env);
      }
    }
    if (method === 'DELETE') {
      const { deleteDepartment } = await import('../db/departments.db');
      await deleteDepartment(env, deptId);
      await logAction(env, adminId, 'DELETE_DEPARTMENT', `Deleted department ID ${deptId}`);
      return jsonResponse({ success: true }, 200, env);
    }
  }

  // ── Leaves ───────────────────────────────────────────────────
  if (path === '/api/admin/leaves' && method === 'GET') {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit') || '20';
    const limit = Math.min(Number(limitParam), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    let query = `
      SELECT l.*, e.full_name, e.telegram_id, a.full_name as approved_by_name
      FROM Leaves l 
      JOIN Employees e ON l.employee_id = e.id 
      LEFT JOIN Employees a ON l.approved_by = a.id
    `;
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE l.status = ? `;
      params.push(status);
    }
    
    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const res = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(res.results, 200, env);
  }

  const leaveMatch = path.match(/^\/api\/admin\/leaves\/(\d+)\/status$/);
  if (leaveMatch && method === 'PUT') {
    const leaveId = parseInt(leaveMatch[1]);
    const { status } = await request.json() as StatusReq;
    if (!['approved', 'rejected'].includes(status)) return jsonResponse({ error: 'Invalid status' }, 400, env);

    const leave = await getLeaveById(env, leaveId);
    if (!leave) return jsonResponse({ error: 'Not found' }, 404, env);

    await updateLeaveStatus(env, leaveId, status, adminId);
    await logAction(env, adminId, status === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE', `Leave ID ${leaveId} ${status}`);

    const emp = await getEmployeeById(env, leave.employee_id);
    if (emp) {
      const msg = status === 'approved'
        ? `✅ *تمت الموافقة على إجازتك*\n📅 ${leave.start_date} ← ${leave.end_date}`
        : `❌ *تم رفض طلب إجازتك*\n📅 ${leave.start_date} ← ${leave.end_date}`;
      try {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: emp.telegram_id, text: msg, parse_mode: 'Markdown' }),
        });
      } catch (_) {}
    }
    return jsonResponse({ success: true }, 200, env);
  }

  // ── Loans ────────────────────────────────────────────────────
  if (path === '/api/admin/loans' && method === 'GET') {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit') || '20';
    const limit = Math.min(Number(limitParam), 500);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    let query = `
      SELECT l.*, e.full_name, e.telegram_id, a.full_name as approved_by_name
      FROM Loans l 
      JOIN Employees e ON l.employee_id = e.id 
      LEFT JOIN Employees a ON l.approved_by = a.id
    `;
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE l.status = ? `;
      params.push(status);
    }
    
    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const res = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(res.results, 200, env);
  }

  const loanMatch = path.match(/^\/api\/admin\/loans\/(\d+)\/status$/);
  if (loanMatch && method === 'PUT') {
    const loanId = parseInt(loanMatch[1]);
    const { status } = await request.json() as StatusReq;
    if (!['approved', 'rejected'].includes(status)) return jsonResponse({ error: 'Invalid status' }, 400, env);

    const loan = await getLoanById(env, loanId);
    if (!loan) return jsonResponse({ error: 'Not found' }, 404, env);

    await updateLoanStatus(env, loanId, status, adminId);
    await logAction(env, adminId, status === 'approved' ? 'APPROVE_LOAN' : 'REJECT_LOAN', `Loan ID ${loanId} ${status}`);

    const emp = await getEmployeeById(env, loan.employee_id);
    if (emp) {
      const msg = status === 'approved'
        ? `✅ *تمت الموافقة على السلفة*\nالمبلغ: ${loan.amount}`
        : `❌ *تم رفض طلب السلفة*\nالمبلغ: ${loan.amount}`;
      try {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: emp.telegram_id, text: msg, parse_mode: 'Markdown' }),
        });
      } catch (_) {}
    }
    return jsonResponse({ success: true }, 200, env);
  }

  // ── Broadcast ────────────────────────────────────────────────
  if (path === '/api/admin/broadcast' && method === 'POST') {
    const { message } = await request.json() as MessageReq;
    if (!message) return jsonResponse({ error: 'Message required' }, 400, env);

    await createAnnouncement(env, message, adminId || 0);
    await logAction(env, adminId, 'BROADCAST', 'Sent broadcast');

    const employees = await getAllEmployees(env);
    let sentCount = 0;
    
    const chunkSize = 50;
    for (let i = 0; i < employees.length; i += chunkSize) {
      const chunk = employees.slice(i, i + chunkSize);
      const promises = chunk.map(e => {
        if (e.id === adminId) return Promise.resolve(0);
        return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: e.telegram_id, text: `📢 *تعميم إداري:*\n\n${escapeMarkdown(message)}`, parse_mode: 'Markdown' }),
        }).then(res => res.ok ? 1 : 0).catch(() => 0);
      });
      const results = await Promise.all(promises);
      sentCount += results.reduce((a, b) => a + (b as number), 0);
    }
    
    return jsonResponse({ success: true, sentCount }, 200, env);
  }

  // ── Settings ─────────────────────────────────────────────────
  if (path === '/api/admin/settings') {
    if (method === 'GET') {
      const settings = await getSettings(env);
      return jsonResponse(settings, 200, env);
    }
    if (method === 'PUT') {
      const { key, value } = await request.json() as SettingReq;
      if (!key || value === undefined) return jsonResponse({ error: 'Missing fields' }, 400, env);
      await updateSetting(env, key, String(value));
      await logAction(env, adminId, 'UPDATE_SETTING', `Setting ${key} updated`);
      return jsonResponse({ success: true }, 200, env);
    }
  }

  // ── Holidays ─────────────────────────────────────────────────
  if (path === '/api/admin/holidays') {
    if (method === 'GET') {
      const res = await env.DB.prepare('SELECT * FROM Holidays ORDER BY holiday_date DESC').all();
      return jsonResponse(res.results, 200, env);
    }
    if (method === 'POST') {
      const { date, description } = await request.json() as HolidayReq;
      if (!date || !isValidDate(date)) {
        return jsonResponse({ error: 'Invalid date format, expected YYYY-MM-DD' }, 400, env);
      }
      const success = await addHoliday(env, date, description || '');
      if (success) {
        await logAction(env, adminId, 'ADD_HOLIDAY', `Added holiday ${date}`);
        return jsonResponse({ success: true }, 200, env);
      }
      return jsonResponse({ error: 'Already exists or error' }, 400, env);
    }
  }

  const holidayMatch = path.match(/^\/api\/admin\/holidays\/(.+)$/);
  if (holidayMatch && method === 'DELETE') {
    const date = holidayMatch[1];
    await removeHoliday(env, date);
    await logAction(env, adminId, 'DELETE_HOLIDAY', `Removed holiday ${date}`);
    return jsonResponse({ success: true }, 200, env);
  }

  // ── Audit Logs ──────────────────────────────────────────────
  if (path === '/api/admin/audit-logs' && method === 'GET') {
    const limitRaw = Number(url.searchParams.get('limit') || '50');
    const offsetRaw = Number(url.searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 100) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(Math.floor(offsetRaw), 0) : 0;
    const action = (url.searchParams.get('action') || '').trim().slice(0, 50);
    const where = action ? 'WHERE a.action = ?' : '';
    const params = action ? [action] : [];
    const [rows, count] = await Promise.all([
      env.DB.prepare(`
        SELECT a.*, e.full_name as admin_name
        FROM AuditLogs a
        LEFT JOIN Employees e ON a.admin_id = e.id
        ${where}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all(),
      env.DB.prepare(`SELECT COUNT(*) as total FROM AuditLogs a ${where}`).bind(...params).first<{ total: number }>()
    ]);
    return jsonResponse({
      items: rows.results,
      pagination: { limit, offset, total: Number(count?.total || 0), hasMore: offset + rows.results.length < Number(count?.total || 0) },
      filter: action || null
    }, 200, env);
  }

  if (path === '/api/admin/audit-logs' && method === 'DELETE') {
    const body = await request.json() as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return jsonResponse({ error: 'IDs array is required' }, 400, env);
    }
    if (body.ids.length > 100) {
      return jsonResponse({ error: 'الحد الأقصى للحذف في الدفعة الواحدة هو 100 سجل لتجنب ضغط قواعد البيانات.' }, 400, env);
    }
    const ids = body.ids.filter((id): id is number => Number.isInteger(id) && id > 0);
    if (ids.length !== body.ids.length) {
      return jsonResponse({ error: 'كل معرّفات السجل يجب أن تكون أرقاماً صحيحة موجبة.' }, 400, env);
    }

    const statements = ids.map(id =>
      env.DB.prepare('DELETE FROM AuditLogs WHERE id = ?').bind(id)
    );
    await env.DB.batch(statements);
    // Keep an accountability event for the destructive operation itself.
    await logAction(env, adminId, 'DELETE_AUDIT_LOGS', 'Deleted ' + ids.length + ' audit log record(s)');
    return jsonResponse({ success: true, count: ids.length }, 200, env);
  }

  // ── GET Payroll List ──────────────────────────────────────────
  if (path === '/api/admin/payroll' && method === 'GET') {
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    let query = `
      SELECT p.*, e.full_name, e.telegram_id 
      FROM Payroll p 
      JOIN Employees e ON p.employee_id = e.id 
    `;
    const params: any[] = [];
    if (month) {
      query += ` WHERE p.month = ? `;
      params.push(month);
    }
    query += ` ORDER BY p.created_at DESC LIMIT 200`;
    
    const res = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(res.results, 200, env);
  }

  // ── Issue Payroll ──────────────────────────────────────────────────
  if (path === '/api/admin/payroll/issue' && method === 'POST') {
    const { month } = await request.json() as PayrollReq;
    if (!month) return jsonResponse({ error: 'Month is required' }, 400, env);

    try {
      const settings = await getSettings(env);
    const startTime = settings['work_start_time'] ?? '09:00';
    const endTime = settings['work_end_time'] ?? '17:00';
    const workMinutes = diffMinutes(endTime, startTime) || 480;

    const employees = await getAllEmployees(env);
    
    const existingPayrolls = await env.DB.prepare("SELECT employee_id FROM Payroll WHERE month = ?").bind(month).all();
    const existingEmpIds = new Set((existingPayrolls.results as any[]).map(r => r.employee_id));

    const startDate = `${month}-01`;
    const [yearStr, monthStr] = month.split('-');
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
    const endDate = `${month}-${daysInMonth}`;

    const lateRes = await env.DB.prepare("SELECT employee_id, SUM(late_minutes) as total_late FROM Attendance WHERE date >= ? AND date <= ? GROUP BY employee_id").bind(startDate, endDate).all();
    const lateMap = new Map((lateRes.results as any[]).map(r => [r.employee_id, Number(r.total_late || 0)]));

    const otRes = await env.DB.prepare("SELECT employee_id, SUM(overtime_minutes) as total_ot FROM Attendance WHERE date >= ? AND date <= ? GROUP BY employee_id").bind(startDate, endDate).all();
    const otMap = new Map((otRes.results as any[]).map(r => [r.employee_id, Number(r.total_ot || 0)]));

    const presentRes = await env.DB.prepare("SELECT employee_id, COUNT(*) as present_days FROM Attendance WHERE date >= ? AND date <= ? AND check_in_time IS NOT NULL GROUP BY employee_id").bind(startDate, endDate).all();
    const presentMap = new Map((presentRes.results as any[]).map(r => [r.employee_id, Number(r.present_days || 0)]));
    const leaveRes = await env.DB.prepare("SELECT employee_id, SUM(julianday(end_date) - julianday(start_date) + 1) as leave_days FROM Leaves WHERE status = 'approved' AND start_date <= ? AND end_date >= ? GROUP BY employee_id").bind(endDate, startDate).all();
    const leaveMap = new Map((leaveRes.results as any[]).map(r => [r.employee_id, Number(r.leave_days || 0)]));
    const holidayRes = await env.DB.prepare("SELECT holiday_date FROM Holidays WHERE holiday_date >= ? AND holiday_date <= ?").bind(startDate, endDate).all();
    const holidays = new Set((holidayRes.results as any[]).map(r => String(r.holiday_date)));
    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = month + '-' + String(day).padStart(2, '0');
      if (!isWeekend(date) && !holidays.has(date)) workingDays++;
    }

    const deductionMultiplier = parseFloat(settings['late_deduction_per_minute'] ?? '1');
    const bonusMultiplier = parseFloat(settings['overtime_bonus_per_minute'] ?? '1');
    const paidAbsenceAllowance = Math.max(0, Number(settings['monthly_paid_leave_days'] ?? 0));
    const absenceEnabled = String(settings['absence_deduction_enabled'] ?? '0') === '1';
    const absenceDeductionPerDay = Math.max(0, Number(settings['absence_deduction_per_day'] ?? 0));

    const attendanceDetailsRes = await env.DB.prepare("SELECT employee_id, date, check_in_time, check_out_time, late_minutes, overtime_minutes FROM Attendance WHERE date >= ? AND date <= ? ORDER BY date ASC").bind(startDate, endDate).all();
    const attendanceDetailsMap = new Map<number, any[]>();
    for (const row of attendanceDetailsRes.results as any[]) {
      if (!attendanceDetailsMap.has(row.employee_id)) attendanceDetailsMap.set(row.employee_id, []);
      attendanceDetailsMap.get(row.employee_id)!.push(row);
    }

    const loansRes = await env.DB.prepare("SELECT id, employee_id, remaining_amount FROM Loans WHERE status = 'approved' ORDER BY created_at ASC").bind().all();
    const loansMap = new Map<number, any[]>();
    for (const r of loansRes.results as any[]) {
      if (!loansMap.has(r.employee_id)) loansMap.set(r.employee_id, []);
      loansMap.get(r.employee_id)!.push(r);
    }

    let issuedCount = 0;
    let skippedCount = 0;
    const batchStatements: any[] = [];
    const notificationPromises: Promise<any>[] = [];
    const issuedDetails: any[] = [];

    for (const employee of employees) {
      if (existingEmpIds.has(employee.id)) {
        skippedCount++;
        continue;
      }

      const lateMinutes = lateMap.get(employee.id) || 0;
      const overtimeMinutes = otMap.get(employee.id) || 0;
      const presentDays = presentMap.get(employee.id) || 0;
      const approvedLeaveDays = leaveMap.get(employee.id) || 0;
      const rawAbsenceDays = Math.max(0, workingDays - presentDays - approvedLeaveDays);
      const absenceDays = absenceEnabled ? Math.max(0, rawAbsenceDays - paidAbsenceAllowance) : 0;
      const activeLoans = loansMap.get(employee.id) || [];
      const activeLoanAmount = activeLoans.reduce((sum, l) => sum + (l.remaining_amount || 0), 0);

      const payroll = calculatePayroll({
        base_salary: employee.base_salary,
        workMinutes,
        lateMinutes,
        overtimeMinutes,
        activeLoan: activeLoanAmount,
        absenceDays,
        absenceDeductionPerDay,
        daysInMonth,
        deductionMultiplier,
        bonusMultiplier
      });

      batchStatements.push(
        env.DB.prepare("INSERT INTO Payroll (employee_id, month, base_salary, total_deductions, total_bonuses, net_salary, status) VALUES (?, ?, ?, ?, ?, ?, 'issued')")
          .bind(employee.id, month, payroll.dynamicMonthSalary, payroll.totalDed, payroll.overtimeBonus, payroll.netSalary)
      );

      let deductionLeft = payroll.loanDeducted;
      for (const loan of activeLoans) {
        if (deductionLeft <= 0) break;
        const deductAmount = Math.min(deductionLeft, loan.remaining_amount);
        deductionLeft -= deductAmount;
        const newRemaining = loan.remaining_amount - deductAmount;
        const newStatus = newRemaining <= 0.01 ? 'paid' : 'approved'; // 0.01 for floating point safety
        batchStatements.push(
          env.DB.prepare("UPDATE Loans SET remaining_amount = ?, status = ? WHERE id = ?")
            .bind(newRemaining, newStatus, loan.id),
          env.DB.prepare(`INSERT OR IGNORE INTO LoanPayments (loan_id, employee_id, payroll_id, month, amount)
            SELECT ?, ?, p.id, ?, ? FROM Payroll p WHERE p.employee_id = ? AND p.month = ?`)
            .bind(loan.id, employee.id, month, deductAmount, employee.id, month)
        );
      }
      
      issuedDetails.push({
        employee, payroll, lateMinutes, overtimeMinutes, presentDays, approvedLeaveDays, absenceDays,
        attendance: attendanceDetailsMap.get(employee.id) || []
      });
      issuedCount++;

      // Process notifications in chunks to avoid OOM
      if (notificationPromises.length >= 50) {
        await Promise.allSettled(notificationPromises);
        notificationPromises.length = 0; // clear array
      }
    }

    if (batchStatements.length > 0) {
      for (let i = 0; i < batchStatements.length; i += 100) {
        const chunk = batchStatements.slice(i, i + 100);
        await env.DB.batch(chunk);
      }
      
      // Send each statement after the database batch succeeds.
      for (const detail of issuedDetails) {
        if (!detail.employee.telegram_id) continue;
        const daily = detail.attendance.map((a: any) => `${a.date}: حضور ${a.check_in_time || '—'} | انصراف ${a.check_out_time || '—'} | تأخير ${Number(a.late_minutes || 0)} د | إضافي ${Number(a.overtime_minutes || 0)} د`);
        let msgText = `🧾 كشف راتب شهر ${month}\n\nالموظف: ${detail.employee.full_name}\nالراتب الأساسي: ${Number(detail.payroll.dynamicMonthSalary).toFixed(2)} ج.م\nأيام الحضور: ${detail.presentDays}\nأيام الإجازة المعتمدة: ${detail.approvedLeaveDays}\nأيام الغياب المحتسبة: ${detail.absenceDays}\nدقائق التأخير: ${detail.lateMinutes}\nخصم التأخير: ${Number(detail.payroll.lateDeduction).toFixed(2)} ج.م\nدقائق الإضافي: ${detail.overtimeMinutes}\nقيمة الإضافي: ${Number(detail.payroll.overtimeBonus).toFixed(2)} ج.م\nخصم الغياب: ${Number(detail.payroll.absenceDeduction).toFixed(2)} ج.م\nخصم السلف: ${Number(detail.payroll.loanDeducted).toFixed(2)} ج.م\nإجمالي الخصومات: ${Number(detail.payroll.totalDed).toFixed(2)} ج.م\nالصافي المستحق: ${Number(detail.payroll.netSalary).toFixed(2)} ج.م`;
        if (daily.length) msgText += `\n\n📅 تفاصيل الحضور اليومية:\n${daily.join('\n')}`;
        msgText += '\n\nهل استلمت راتبك يداً بيد؟';
        const keyboard = { inline_keyboard: [[{ text: '✅ تأكيد الاستلام', callback_data: `confirm_payroll_${detail.employee.id}_${month}` }]] };
        notificationPromises.push(fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: detail.employee.telegram_id, text: msgText.slice(0, 3900), reply_markup: keyboard }) }));
      }

      // Notify admins
      const admins = employees.filter(e => e.role === 'admin' && e.telegram_id);
      for (const admin of admins) {
        notificationPromises.push(
          fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: admin.telegram_id,
              text: `✅ *تم إصدار رواتب شهر ${month} بنجاح!*\n\nتم إصدار ${issuedCount} راتب، وتخطي ${skippedCount} راتب.`,
              parse_mode: 'Markdown'
            })
          })
        );
      }
    }

    if (notificationPromises.length > 0) {
      await Promise.allSettled(notificationPromises);
    }
    return jsonResponse({ success: true, issuedCount, skippedCount }, 200, env);
    } catch (err: any) {
      console.error(err);
      return jsonResponse({ error: err.message }, 500, env);
    }
  }

  return null;
}

