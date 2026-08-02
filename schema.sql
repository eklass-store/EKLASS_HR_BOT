-- جدول الموظفين (البيانات الثابتة)
CREATE TABLE IF NOT EXISTS Employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee', -- 'admin' أو 'employee'
    base_salary REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الحضور والانصراف (يتم تنظيفه شهرياً)
CREATE TABLE IF NOT EXISTS Attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    check_in_time TEXT, -- HH:MM
    check_out_time TEXT, -- HH:MM
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);

-- جدول الإجازات (يتم تنظيفه شهرياً)
CREATE TABLE IF NOT EXISTS Leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    type TEXT NOT NULL, -- sick, casual, etc.
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    FOREIGN KEY(employee_id) REFERENCES Employees(id)
);
