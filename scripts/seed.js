const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://eklass-hr.pages.dev';

async function seed() {
  try {
    console.log('Fetching admin data...');
    const adminRes = await fetch(`${BASE_URL}/api/dev/admin`);
    let admin = await adminRes.json();
    if (!admin || !admin.telegram_id) {
      console.warn('Could not fetch admin data. Using hardcoded admin.');
      admin = { full_name: 'المدير العام', telegram_id: '7109332130' };
    }
    console.log(`Saved Admin: ${admin.full_name} (${admin.telegram_id})`);

    // Drop and create schema
    console.log('Dropping and recreating schema...');
    const ddl = [
      "DROP TABLE IF EXISTS Holidays",
      "DROP TABLE IF EXISTS AuditLogs",
      "DROP TABLE IF EXISTS ConversationState",
      "DROP TABLE IF EXISTS Announcements",
      "DROP TABLE IF EXISTS Payroll",
      "DROP TABLE IF EXISTS Loans",
      "DROP TABLE IF EXISTS Leaves",
      "DROP TABLE IF EXISTS Attendance",
      "DROP TABLE IF EXISTS Employees",
      "DROP TABLE IF EXISTS Departments",
      "DROP TABLE IF EXISTS Settings",
      `CREATE TABLE IF NOT EXISTS Departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, manager_id INTEGER DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS Employees (id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, role TEXT DEFAULT 'employee', base_salary REAL DEFAULT 0, department_id INTEGER DEFAULT NULL, is_active INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(department_id) REFERENCES Departments(id))`,
      `CREATE TABLE IF NOT EXISTS Settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS Attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, date TEXT NOT NULL, check_in_time TEXT, check_out_time TEXT, late_minutes INTEGER DEFAULT 0, overtime_minutes INTEGER DEFAULT 0, FOREIGN KEY(employee_id) REFERENCES Employees(id), UNIQUE(employee_id, date))`,
      `CREATE TABLE IF NOT EXISTS Leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, type TEXT NOT NULL, status TEXT DEFAULT 'pending', reason TEXT, approved_by INTEGER DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(employee_id) REFERENCES Employees(id), FOREIGN KEY(approved_by) REFERENCES Employees(id))`,
      `CREATE TABLE IF NOT EXISTS Loans (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, amount REAL NOT NULL, reason TEXT NOT NULL, status TEXT DEFAULT 'pending', approved_by INTEGER DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(employee_id) REFERENCES Employees(id), FOREIGN KEY(approved_by) REFERENCES Employees(id))`,
      `CREATE TABLE IF NOT EXISTS Payroll (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, month TEXT NOT NULL, base_salary REAL NOT NULL, total_deductions REAL DEFAULT 0, total_bonuses REAL DEFAULT 0, net_salary REAL NOT NULL, status TEXT DEFAULT 'issued', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(employee_id) REFERENCES Employees(id), UNIQUE(employee_id, month))`,
      `CREATE TABLE IF NOT EXISTS Announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT NOT NULL, created_by INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(created_by) REFERENCES Employees(id))`,
      `CREATE TABLE IF NOT EXISTS ConversationState (telegram_id TEXT PRIMARY KEY, state TEXT NOT NULL, data TEXT DEFAULT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS AuditLogs (id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(admin_id) REFERENCES Employees(id))`,
      `CREATE TABLE IF NOT EXISTS Holidays (id INTEGER PRIMARY KEY AUTOINCREMENT, holiday_date TEXT NOT NULL UNIQUE, description TEXT)`,
      `CREATE TRIGGER IF NOT EXISTS update_conversation_state_timestamp AFTER INSERT ON ConversationState BEGIN UPDATE ConversationState SET updated_at = CURRENT_TIMESTAMP WHERE telegram_id = NEW.telegram_id; END;`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON Attendance(employee_id, date)`,
      `CREATE INDEX IF NOT EXISTS idx_leaves_employee_status ON Leaves(employee_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_loans_employee_status ON Loans(employee_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON Payroll(employee_id, month)`
    ];
    
    // We can send these via /api/dev/seed as queries with empty params!
    console.log('Sending DDL to /api/dev/seed...');
    const ddlQueries = ddl.map(sql => ({ sql, params: [] }));
    const createRes = await fetch(`${BASE_URL}/api/dev/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: ddlQueries })
    });
    
    if (!createRes.ok) {
       const text = await createRes.text();
       throw new Error(`DDL Execute failed with ${createRes.status}: ${text}`);
    }
    const createJson = await createRes.json();
    if (!createJson.success) {
      throw new Error('Failed to execute DDL sql: ' + JSON.stringify(createJson));
    }
    console.log('Schema created successfully!');

    let queries = [];

    // Settings
    console.log('Generating base data...');
    queries.push({
      sql: `INSERT OR IGNORE INTO Settings (key, value) VALUES (?,?), (?,?), (?,?), (?,?), (?,?), (?,?)`,
      params: ['work_start_time','09:00', 'work_end_time','17:00', 'late_deduction_per_minute','5', 'annual_leave_quota','21', 'max_loan_percentage','50', 'overtime_bonus_per_minute','5']
    });

    // Departments
    const depts = ['الإدارة العليا', 'الموارد البشرية', 'التسويق والمبيعات', 'المالية', 'تقنية المعلومات', 'الدعم الفني', 'خدمة العملاء', 'الشؤون القانونية'];
    depts.forEach(d => {
      queries.push({ sql: `INSERT INTO Departments (name) VALUES (?)`, params: [d] });
    });

    // Employees
    queries.push({
      sql: `INSERT INTO Employees (id, telegram_id, full_name, role, base_salary, department_id, is_active) VALUES (1, ?, ?, 'admin', 50000, 1, 1)`,
      params: [admin.telegram_id, admin.full_name]
    });

    const firstNames = ['أحمد', 'محمد', 'محمود', 'علي', 'عمر', 'طارق', 'خالد', 'سعيد', 'يوسف', 'حسن', 'عبدالله', 'ماجد', 'فهد', 'سعد'];
    const lastNames = ['صالح', 'إبراهيم', 'حسين', 'سالم', 'منصور', 'كامل', 'جابر', 'خليل', 'عبدالرحمن', 'فاروق', 'عثمان', 'رضا'];

    console.log('Generating 100 Employees...');
    for (let i = 2; i <= 101; i++) {
      const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
      const salary = Math.floor(Math.random() * 10000) + 5000;
      const deptId = Math.floor(Math.random() * 8) + 1;
      queries.push({
        sql: `INSERT INTO Employees (id, telegram_id, full_name, role, base_salary, department_id, is_active) VALUES (?, ?, ?, 'employee', ?, ?, 1)`,
        params: [i, `fake_${i}`, name, salary, deptId]
      });
    }

    // 700 Days of Attendance per employee (approx 2 years) => ~50,000 records
    console.log('Generating Attendance records... This will take time to generate locally.');
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);

    for (let i = 1; i <= 101; i++) { // For all 101 employees
      let d = new Date(startDate);
      const today = new Date();
      while (d <= today) {
        // Skip weekends roughly
        if (d.getDay() !== 5 && d.getDay() !== 6) { 
          // 90% chance to be present
          if (Math.random() < 0.90) {
            const dateStr = d.toISOString().split('T')[0];
            // Random checkin between 08:30 and 10:30
            const checkInMins = 8 * 60 + 30 + Math.floor(Math.random() * 120);
            const checkInStr = `${String(Math.floor(checkInMins/60)).padStart(2,'0')}:${String(checkInMins%60).padStart(2,'0')}`;
            
            // Late minutes
            let lateMins = checkInMins > 9 * 60 ? checkInMins - 9 * 60 : 0;
            
            // Random checkout between 17:00 and 19:00
            const checkOutMins = 17 * 60 + Math.floor(Math.random() * 120);
            const checkOutStr = `${String(Math.floor(checkOutMins/60)).padStart(2,'0')}:${String(checkOutMins%60).padStart(2,'0')}`;

            let overTimeMins = checkOutMins > 17 * 60 ? checkOutMins - 17 * 60 : 0;

            queries.push({
              sql: `INSERT INTO Attendance (employee_id, date, check_in_time, check_out_time, late_minutes, overtime_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
              params: [i, dateStr, checkInStr, checkOutStr, lateMins, overTimeMins]
            });
          }
        }
        d.setDate(d.getDate() + 1);
      }
    }

    // Leaves
    console.log('Generating Leaves...');
    for (let i = 0; i < 2000; i++) {
       const empId = Math.floor(Math.random() * 101) + 1;
       const types = ['annual', 'sick', 'emergency'];
       const status = ['approved', 'rejected', 'pending'];
       queries.push({
          sql: `INSERT INTO Leaves (employee_id, start_date, end_date, type, status, reason, approved_by) VALUES (?, '2024-05-10', '2024-05-12', ?, ?, 'سبب وهمي لطلب إجازة ضرورية', 1)`,
          params: [empId, types[Math.floor(Math.random()*3)], status[Math.floor(Math.random()*3)]]
       });
    }

    // Loans
    console.log('Generating Loans...');
    for (let i = 0; i < 2000; i++) {
       const empId = Math.floor(Math.random() * 101) + 1;
       const status = ['approved', 'rejected', 'pending', 'paid'];
       queries.push({
          sql: `INSERT INTO Loans (employee_id, amount, reason, status, approved_by) VALUES (?, ?, 'سلفة مالية لحالة طارئة', ?, 1)`,
          params: [empId, Math.floor(Math.random() * 3000) + 500, status[Math.floor(Math.random()*4)]]
       });
    }

    // Payrolls
    console.log('Generating Payrolls...');
    for (let i = 1; i <= 101; i++) {
      for (let m = 1; m <= 12; m++) {
        const monthStr = `2024-${String(m).padStart(2,'0')}`;
        queries.push({
           sql: `INSERT INTO Payroll (employee_id, month, base_salary, total_deductions, total_bonuses, net_salary, status) VALUES (?, ?, 5000, 200, 500, 5300, 'issued')`,
           params: [i, monthStr]
        });
      }
    }

    // Audit logs
    console.log('Generating Audit Logs...');
    for (let i = 0; i < 5000; i++) {
       queries.push({
          sql: `INSERT INTO AuditLogs (admin_id, action, details) VALUES (1, 'تعديل وهمي', 'قام الأدمن بإجراء تعديل رقم ${i}')`,
          params: []
       });
    }

    console.log(`Total queries generated: ${queries.length}`);
    console.log('Sending in chunks of 50...');
    
    // D1 batch has a limit of 100 statements per request, we use 50 to be safe
    const CHUNK_SIZE = 50;
    for (let i = 0; i < queries.length; i += CHUNK_SIZE) {
      const chunk = queries.slice(i, i + CHUNK_SIZE);
      let success = false;
      let retries = 0;
      while (!success && retries < 3) {
        try {
          const res = await fetch(`${BASE_URL}/api/dev/seed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: chunk })
          });
          if (!res.ok) {
             const txt = await res.text();
             throw new Error(txt);
          }
          const data = await res.json();
          if (!data.success) throw new Error(JSON.stringify(data));
          success = true;
        } catch (err) {
          retries++;
          console.error(`Chunk ${i} failed, retrying (${retries}/3)...`, err.message);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (!success) {
        console.error('FAILED AT CHUNK:', i);
        process.exit(1);
      }
      
      if (i % 1000 === 0) {
        console.log(`Inserted ${i} / ${queries.length} queries...`);
      }
    }

    console.log('All Done! Database seeded with approx 10MB of data.');
  } catch(e) {
    console.error('Error during seed:', e);
  }
}

seed();
