import { Env } from '../types';
import { addEmployee, updateEmployeeSalary, updateEmployeeRole, softDeleteEmployee, getEmployeeById, getAllEmployees } from '../db/employees.db';
import { updateLeaveStatus, getLeaveById } from '../db/leaves.db';
import { updateLoanStatus, getLoanById } from '../db/loans.db';
import { getSettings, updateSetting } from '../db/settings.db';
import { addHoliday, removeHoliday } from '../db/holidays.db';
import { createAnnouncement } from '../db/announcements.db';
import { logAction } from '../db/audit.db';
import { issuePayroll, hasPayrollForMonth } from '../db/payroll.db';
import { getTotalLateMinutes } from '../db/attendance.db';
import { getTotalActiveLoan, markEmployeeLoansAsPaid } from '../db/loans.db';
import { getDaysInMonth, calcLateMinutes, isValidDate } from '../utils/time';
import { escapeMarkdown } from '../utils/markdown';

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
      if (data.base_salary !== undefined) await updateEmployeeSalary(env, empId, data.base_salary);
      if (data.role !== undefined) await updateEmployeeRole(env, empId, data.role);
      if (data.is_active !== undefined && !data.full_name) {
        await env.DB.prepare('UPDATE Employees SET is_active = ? WHERE id = ?')
          .bind(data.is_active ? 1 : 0, empId).run();
      } else if (data.full_name && data.telegram_id) {
        await env.DB.prepare('UPDATE Employees SET full_name = ?, department_id = ?, is_active = ? WHERE id = ?')
          .bind(data.full_name, data.department_id || null, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1, empId).run();
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
    const limit = parseInt(url.searchParams.get('limit') || '20');
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
    const limit = parseInt(url.searchParams.get('limit') || '20');
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
    
    // TASK 9: Process in parallel chunks to avoid timeout
    const chunkSize = 50;
    for (let i = 0; i < employees.length; i += chunkSize) {
      const chunk = employees.slice(i, i + chunkSize);
      const promises = chunk.map(e => 
        fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: e.telegram_id, text: `📢 *تعميم إداري:*\n\n${escapeMarkdown(message)}`, parse_mode: 'Markdown' }),
        }).then(res => res.ok ? 1 : 0).catch(() => 0)
      );
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
    const res = await env.DB.prepare(`
      SELECT a.*, e.full_name as admin_name 
      FROM AuditLogs a 
      LEFT JOIN Employees e ON a.admin_id = e.id 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `).all();
    return jsonResponse(res.results, 200, env);
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

    const settings = await getSettings(env);
    const startTime = settings['work_start_time'] ?? '09:00';
    const endTime = settings['work_end_time'] ?? '17:00';
    const workMinutes = calcLateMinutes(endTime, startTime) || 480;

    const employees = await getAllEmployees(env);
    
    // TASK 10: Fetch all existing payrolls, late minutes, and loans in batch
    const existingPayrolls = await env.DB.prepare("SELECT employee_id FROM Payroll WHERE month = ?").bind(month).all();
    const existingEmpIds = new Set((existingPayrolls.results as any[]).map(r => r.employee_id));

    const lateRes = await env.DB.prepare("SELECT employee_id, SUM(late_minutes) as total_late FROM Attendance WHERE date LIKE ? GROUP BY employee_id").bind(`${month}-%`).all();
    const lateMap = new Map((lateRes.results as any[]).map(r => [r.employee_id, r.total_late || 0]));

      const otRes = await env.DB.prepare("SELECT employee_id, SUM(overtime_minutes) as total_ot FROM Attendance WHERE date LIKE ? GROUP BY employee_id").bind(`${month}-%`).all();
      const otMap = new Map((otRes.results as any[]).map(r => [r.employee_id, r.total_ot || 0]));
      
      const deductionMultiplier = parseFloat(settings['late_deduction_per_minute'] ?? '1');
      const bonusMultiplier = parseFloat(settings['overtime_bonus_per_minute'] ?? '1');

    const loansRes = await env.DB.prepare("SELECT employee_id, SUM(amount) as total_loan FROM Loans WHERE status = 'approved' GROUP BY employee_id").bind().all();
    const loansMap = new Map((loansRes.results as any[]).map(r => [r.employee_id, r.total_loan || 0]));

    let issuedCount = 0;
    let skippedCount = 0;
    const batchStatements: any[] = [];
    const notificationPromises: Promise<any>[] = [];

    for (const employee of employees) {
      if (existingEmpIds.has(employee.id)) {
        skippedCount++;
        continue;
      }

      const dynamicMonthSalary = employee.base_salary; // TASK 6: Fixed salary calculation
      const dailyRate = employee.base_salary / 30;
      const minuteRate = dailyRate / workMinutes;

      const lateMinutes = lateMap.get(employee.id) || 0;
      const lateDeduction = lateMinutes * minuteRate;
      
      const activeLoan = loansMap.get(employee.id) || 0;
      
      // TASK 7: Deduct loan only up to available salary
      const availableForLoan = Math.max(0, dynamicMonthSalary - lateDeduction);
      const loanDeducted = Math.min(activeLoan, availableForLoan);
      
      const totalDed = lateDeduction + loanDeducted;
      const netSalary = Math.max(0, dynamicMonthSalary - totalDed);

      // TASK 8: Prepare batch statements
      batchStatements.push(
        env.DB.prepare("INSERT INTO Payroll (employee_id, month, base_salary, total_deductions, net_salary, status) VALUES (?, ?, ?, ?, ?, 'issued')")
          .bind(employee.id, month, dynamicMonthSalary, totalDed, netSalary)
      );

      if (activeLoan > 0 && loanDeducted === activeLoan) {
        batchStatements.push(
          env.DB.prepare("UPDATE Loans SET status = 'paid' WHERE employee_id = ? AND status = 'approved'")
            .bind(employee.id)
        );
      }
      
      // TASK 11: Send Telegram message with Confirmation button
      if (employee.telegram_id) {
        let msgText = `💰 *تم إصدار راتبك لشهر ${month}*\n\nالراتب الأساسي: ${dynamicMonthSalary.toFixed(2)} ج.م\n`;
          if (overtimeBonus > 0) msgText += `الإضافي: ${overtimeBonus.toFixed(2)} ج.م\n`;
          msgText += `إجمالي الخصومات/السلف: ${totalDed.toFixed(2)} ج.م\n*الصافي المستحق:* ${netSalary.toFixed(2)} ج.م\n\nهل استلمت راتبك يداً بيد؟`;
        const keyboard = {
          inline_keyboard: [[
            { text: "✅ تأكيد الاستلام", callback_data: `confirm_payroll_${month}` }
          ]]
        };
        notificationPromises.push(
          fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: employee.telegram_id,
              text: msgText,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            })
          })
        );
      }
      
      issuedCount++;
    }

    if (batchStatements.length > 0) {
      for (let i = 0; i < batchStatements.length; i += 100) {
        const chunk = batchStatements.slice(i, i + 100);
        await env.DB.batch(chunk);
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
  }

  return null;
}
