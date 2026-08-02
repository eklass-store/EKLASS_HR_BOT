-- جدول الموظفين (البيانات الثابتة)
CREATE TABLE IF NOT EXISTS Employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee', -- 'admin' أو 'employee'
    base_salary REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإعدادات العامة (مواعيد العمل وغيرها)
CREATE TABLE IF NOT EXISTS Settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- افتراضياً: يبدأ الدوام الساعة 09:00 وينتهي 17:00
INSERT OR IGNORE INTO Settings (key, value) VALUES ('work_start_time', '09:00'), ('work_end_time', '17:00');

-- جدول الحضور والانصراف (أصبح يحفظ التأخير بالدقائق ولا يمسح شهرياً بل يُؤرشف)
CREATE TABLE IF NOT EXISTS Attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    check_in_time TEXT, -- HH:MM
    check_out_time TEXT, -- HH:MM
    late_minutes INTEGER DEFAULT 0,
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- جدول الإجازات (تم تطويره)
CREATE TABLE IF NOT EXISTS Leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    type TEXT NOT NULL, -- sick, annual, emergency
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- جدول السلف والعهد
CREATE TABLE IF NOT EXISTS Loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, paid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- جدول الرواتب المصدرة (لحفظ السجل التاريخي)
CREATE TABLE IF NOT EXISTS Payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM
    base_salary REAL NOT NULL,
    total_deductions REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    status TEXT DEFAULT 'issued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- جدول التعاميم
CREATE TABLE IF NOT EXISTS Announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_by INTEGER NOT NULL, -- admin id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES Employees(id)
);
