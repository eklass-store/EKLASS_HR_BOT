-- ============================================================
-- EKLASS HR BOT — Database Schema (v2 — Fixed & Extended)
-- ============================================================

-- ── جدول الموظفين ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT    UNIQUE NOT NULL,
    full_name   TEXT    NOT NULL,
    role        TEXT    DEFAULT 'employee',  -- 'admin' | 'employee'
    base_salary REAL    DEFAULT 0,
    department  TEXT    DEFAULT NULL,
    is_active   INTEGER DEFAULT 1,           -- FIX: soft-delete بدل حذف فعلي
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── جدول الإعدادات ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- قيم افتراضية
INSERT OR IGNORE INTO Settings (key, value) VALUES
    ('work_start_time',           '09:00'),
    ('work_end_time',             '17:00'),
    ('late_deduction_per_minute', '0'),     -- NEW: جنيه لكل دقيقة تأخير
    ('annual_leave_quota',        '21'),    -- NEW: الحصة السنوية للإجازات
    ('max_loan_percentage',       '50');    -- NEW: الحد الأقصى للسلفة (نسبة مئوية من الراتب)

-- ── جدول الحضور والانصراف ───────────────────────────────────
-- FIX BUG-01: إضافة UNIQUE(employee_id, date) لمنع تكرار الحضور في نفس اليوم
CREATE TABLE IF NOT EXISTS Attendance (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id    INTEGER NOT NULL,
    date           TEXT    NOT NULL,  -- YYYY-MM-DD
    check_in_time  TEXT,              -- HH:MM
    check_out_time TEXT,              -- HH:MM
    late_minutes   INTEGER DEFAULT 0,
    FOREIGN KEY(employee_id) REFERENCES Employees(id),
    UNIQUE(employee_id, date)         -- ← المنع الحقيقي للتكرار
);

-- ── جدول الإجازات ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Leaves (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    start_date  TEXT    NOT NULL,  -- YYYY-MM-DD
    end_date    TEXT    NOT NULL,  -- YYYY-MM-DD
    type        TEXT    NOT NULL,  -- annual | sick | emergency
    status      TEXT    DEFAULT 'pending',  -- pending | approved | rejected
    reason      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- ── جدول السلف ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Loans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    amount      REAL    NOT NULL,
    reason      TEXT    NOT NULL,
    status      TEXT    DEFAULT 'pending',  -- pending | approved | rejected | paid
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- ── جدول الرواتب المصدرة ────────────────────────────────────
-- FIX: إضافة UNIQUE(employee_id, month) لمنع إصدار راتب مكرر لنفس الشهر
CREATE TABLE IF NOT EXISTS Payroll (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id      INTEGER NOT NULL,
    month            TEXT    NOT NULL,  -- YYYY-MM
    base_salary      REAL    NOT NULL,
    total_deductions REAL    DEFAULT 0,
    net_salary       REAL    NOT NULL,
    status           TEXT    DEFAULT 'issued',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES Employees(id),
    UNIQUE(employee_id, month)
);

-- ── جدول التعاميم ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    message    TEXT    NOT NULL,
    created_by INTEGER NOT NULL,  -- employee id (admin)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES Employees(id)
);

-- ── جدول حالة المحادثة (NEW) ────────────────────────────────
-- لتتبع المحادثات متعددة الخطوات (طلب إجازة، سلفة، إضافة موظف...)
CREATE TABLE IF NOT EXISTS ConversationState (
    telegram_id TEXT PRIMARY KEY,
    state       TEXT NOT NULL,   -- e.g. 'awaiting_leave_start_date'
    data        TEXT DEFAULT NULL, -- JSON: extra context
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── جدول سجل التدقيق (Audit Logs) ───────────────────────────
CREATE TABLE IF NOT EXISTS AuditLogs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id   INTEGER NOT NULL,
    action     TEXT    NOT NULL,
    details    TEXT    NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_id) REFERENCES Employees(id)
);

-- ── جدول العطلات والأيام المستثناة (NEW) ───────────────────
CREATE TABLE IF NOT EXISTS Holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holiday_date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
    description TEXT
);

-- ── الفهارس لتسريع البحث (Indexes) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON Attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leaves_employee_status ON Leaves(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_employee_status ON Loans(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON Payroll(employee_id, month);
