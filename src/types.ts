// ============================================================
// src/types.ts — All TypeScript Interfaces & Types
// ============================================================

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  TIMEZONE?: string; // e.g. 'Africa/Cairo', 'Asia/Riyadh'
  API_KEY?: string;
  INITIAL_ADMIN_ID?: string;
}

export interface Employee {
  id: number;
  telegram_id: string;
  full_name: string;
  role: 'admin' | 'employee';
  base_salary: number;
  department: string | null;
  is_active: number; // 1 = active, 0 = soft-deleted
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  date: string;           // YYYY-MM-DD
  check_in_time: string | null;   // HH:MM
  check_out_time: string | null;  // HH:MM
  late_minutes: number;
}

export interface Leave {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  type: 'annual' | 'sick' | 'emergency';
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
}

export interface Loan {
  id: number;
  employee_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at: string;
}

export interface PayrollRecord {
  id: number;
  employee_id: number;
  month: string;   // YYYY-MM
  base_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  created_at: string;
}

export interface ConversationState {
  telegram_id: string;
  state: string;
  data: string | null;
  updated_at: string;
}

export interface DailyAttendanceRow {
  full_name: string;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number;
}
