import { Env } from '../types';
import { addEmployee, updateEmployeeSalary, updateEmployeeRole, softDeleteEmployee, getEmployeeById, getAllEmployees } from '../db/employees.db';
import { updateLeaveStatus, getLeaveById } from '../db/leaves.db';
import { updateLoanStatus, getLoanById } from '../db/loans.db';
import { getSettings, updateSetting } from '../db/settings.db';
import { addHoliday, removeHoliday, getHolidaysInMonth } from '../db/holidays.db';
import { createAnnouncement } from '../db/announcements.db';
import { logAction } from '../db/audit.db';
import { issuePayroll, hasPayrollForMonth } from '../db/payroll.db';
import { getTotalLateMinutes } from '../db/attendance.db';
import { getTotalActiveLoan, markEmployeeLoansAsPaid } from '../db/loans.db';
import { getDaysInMonth, calcLateMinutes } from '../utils/time';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY',
};

// Helper for standard JSON responses
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
};

export async function handleAdminRoutes(
  request: Request,
  env: Env,
  adminId: number // ID from decoded JWT or 0 if API key
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ── Employees ────────────────────────────────────────────────
  if (path === '/api/admin/employees') {
    if (method === 'POST') {
      const data = await request.json() as any;
      if (!data.telegram_id || !data.full_name) return jsonResponse({ error: 'Missing fields' }, 400);
      try {
        const id = await addEmployee(env, data.telegram_id, data.full_name, data.base_salary || 0, data.department || '', data.role || 'employee');
        await logAction(env, adminId, 'ADD_EMPLOYEE', `Added employee ${data.full_name}`);
        return jsonResponse({ success: true, id });
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }
  }

  const empMatch = path.match(/^\/api\/admin\/employees\/(\d+)$/);
  if (empMatch) {
    const empId = parseInt(empMatch[1]);
    if (method === 'PUT') {
      const data = await request.json() as any;
      // We can update multiple things.
      if (data.base_salary !== undefined) await updateEmployeeSalary(env, empId, data.base_salary);
      if (data.role !== undefined) await updateEmployeeRole(env, empId, data.role);
      // For full name / department updates, we could add a DB function, but for now we re-use addEmployee logic which acts as upsert if telegram_id exists.
      if (data.full_name && data.telegram_id) {
         await env.DB.prepare("UPDATE Employees SET full_name = ?, department = ?, is_active = ? WHERE id = ?")
           .bind(data.full_name, data.department || '', data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1, empId).run();
      }
      await logAction(env, adminId, 'UPDATE_EMPLOYEE', `Updated employee ID ${empId}`);
      return jsonResponse({ success: true });
    }
    if (method === 'DELETE') {
      await softDeleteEmployee(env, empId);
      await logAction(env, adminId, 'DELETE_EMPLOYEE', `Soft deleted employee ID ${empId}`);
      return jsonResponse({ success: true });
    }
  }

  // ── Leaves ───────────────────────────────────────────────────
  if (path === '/api/admin/leaves' && method === 'GET') {
    // Fetch all leaves, not just pending
    const res = await env.DB.prepare(`
      SELECT l.*, e.full_name, e.telegram_id 
      FROM Leaves l 
      JOIN Employees e ON l.employee_id = e.id 
      ORDER BY l.created_at DESC LIMIT 100
    `).all();
    return jsonResponse(res.results);
  }

  const leaveMatch = path.match(/^\/api\/admin\/leaves\/(\d+)\/status$/);
  if (leaveMatch && method === 'PUT') {
    const leaveId = parseInt(leaveMatch[1]);
    const { status } = await request.json() as any;
    if (!['approved', 'rejected'].includes(status)) return jsonResponse({ error: 'Invalid status' }, 400);

    const leave = await getLeaveById(env, leaveId);
    if (!leave) return jsonResponse({ error: 'Not found' }, 404);

    await updateLeaveStatus(env, leaveId, status);
    await logAction(env, adminId, status === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE', `Leave ID ${leaveId} ${status}`);

    // Notify employee
    const emp = await getEmployeeById(env, leave.employee_id);
    if (emp) {
      const msg = status === 'approved' 
        ? `✅ *تمت الموافقة على إجازتك*\n📅 ${leave.start_date} ← ${leave.end_date}`
        : `❌ *تم رفض طلب إجازتك*\n📅 ${leave.start_date} ← ${leave.end_date}`;
      try {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: emp.telegram_id, text: msg, parse_mode: 'Markdown' })
        });
      } catch (e) {}
    }
    return jsonResponse({ success: true });
  }

  // ── Loans ────────────────────────────────────────────────────
  if (path === '/api/admin/loans' && method === 'GET') {
    const res = await env.DB.prepare(`
      SELECT l.*, e.full_name, e.telegram_id 
      FROM Loans l 
      JOIN Employees e ON l.employee_id = e.id 
      ORDER BY l.created_at DESC LIMIT 100
    `).all();
    return jsonResponse(res.results);
  }

  const loanMatch = path.match(/^\/api\/admin\/loans\/(\d+)\/status$/);
  if (loanMatch && method === 'PUT') {
    const loanId = parseInt(loanMatch[1]);
    const { status } = await request.json() as any;
    if (!['approved', 'rejected'].includes(status)) return jsonResponse({ error: 'Invalid status' }, 400);

    const loan = await getLoanById(env, loanId);
    if (!loan) return jsonResponse({ error: 'Not found' }, 404);

    await updateLoanStatus(env, loanId, status);
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
          body: JSON.stringify({ chat_id: emp.telegram_id, text: msg, parse_mode: 'Markdown' })
        });
      } catch (e) {}
    }
    return jsonResponse({ success: true });
  }

  // ── Broadcast ────────────────────────────────────────────────
  if (path === '/api/admin/broadcast' && method === 'POST') {
    const { message } = await request.json() as any;
    if (!message) return jsonResponse({ error: 'Message required' }, 400);

    await createAnnouncement(env, message, adminId || 0); // fallback to 0 if API key
    await logAction(env, adminId, 'BROADCAST', `Sent broadcast`);

    const employees = await getAllEmployees(env);
    let sentCount = 0;
    
    // Process in batches so we don't timeout CF worker easily (max 30s)
    for (const e of employees) {
      try {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: e.telegram_id, text: `📢 *تعميم إداري:*\n\n${message}`, parse_mode: 'Markdown' })
        });
        sentCount++;
      } catch (err) {}
    }
    return jsonResponse({ success: true, sentCount });
  }

  // ── Settings ─────────────────────────────────────────────────
  if (path === '/api/admin/settings') {
    if (method === 'GET') {
      const settings = await getSettings(env);
      return jsonResponse(settings);
    }
    if (method === 'PUT') {
      const { key, value } = await request.json() as any;
      if (!key || value === undefined) return jsonResponse({ error: 'Missing fields' }, 400);
      await updateSetting(env, key, String(value));
      await logAction(env, adminId, 'UPDATE_SETTING', `Setting ${key} updated`);
      return jsonResponse({ success: true });
    }
  }

  // ── Holidays ─────────────────────────────────────────────────
  if (path === '/api/admin/holidays') {
    if (method === 'GET') {
      const res = await env.DB.prepare("SELECT * FROM Holidays ORDER BY holiday_date DESC").all();
      return jsonResponse(res.results);
    }
    if (method === 'POST') {
      const { date, description } = await request.json() as any;
      const success = await addHoliday(env, date, description || '');
      if (success) {
        await logAction(env, adminId, 'ADD_HOLIDAY', `Added holiday ${date}`);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Already exists or error' }, 400);
    }
  }

  const holidayMatch = path.match(/^\/api\/admin\/holidays\/(.+)$/);
  if (holidayMatch && method === 'DELETE') {
    const date = holidayMatch[1];
    await removeHoliday(env, date);
    await logAction(env, adminId, 'DELETE_HOLIDAY', `Removed holiday ${date}`);
    return jsonResponse({ success: true });
  }

  // ── Payroll ──────────────────────────────────────────────────
  if (path === '/api/admin/payroll/issue' && method === 'POST') {
    const { month } = await request.json() as any; // YYYY-MM
    if (!month) return jsonResponse({ error: 'Month is required' }, 400);

    const settings = await getSettings(env);
    const startTime = settings['work_start_time'] ?? '09:00';
    const endTime = settings['work_end_time'] ?? '17:00';
    
    // إجمالي دقائق العمل في اليوم
    const workMinutes = calcLateMinutes(endTime, startTime) || 480; 
    const daysInMonth = getDaysInMonth(month);

    const employees = await getAllEmployees(env);
    let issuedCount = 0;
    let skippedCount = 0;

    for (const employee of employees) {
      if (await hasPayrollForMonth(env, employee.id, month)) {
        skippedCount++;
        continue;
      }

      const baseSalary = employee.base_salary;
      const dailyRate = baseSalary / 30;
      const dynamicMonthSalary = dailyRate * daysInMonth;
      const minuteRate = dailyRate / workMinutes;

      const lateMinutes   = await getTotalLateMinutes(env, employee.id, month);
      const lateDeduction = lateMinutes * minuteRate;
      const activeLoan    = await getTotalActiveLoan(env, employee.id);
      
      const totalDed      = lateDeduction + activeLoan;
      const netSalary     = Math.max(0, dynamicMonthSalary - totalDed);

      await issuePayroll(env, employee.id, month, dynamicMonthSalary, totalDed, netSalary);
      
      if (activeLoan > 0) {
        await markEmployeeLoansAsPaid(env, employee.id);
      }
      issuedCount++;
    }

    await logAction(env, adminId, 'ISSUE_PAYROLL', `Issued payroll for ${month} (${issuedCount} issued)`);
    return jsonResponse({ success: true, issuedCount, skippedCount });
  }

  return null;
}
