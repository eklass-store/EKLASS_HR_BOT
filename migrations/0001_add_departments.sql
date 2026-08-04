-- 0001_add_departments.sql

-- إنشاء جدول الأقسام
CREATE TABLE IF NOT EXISTS Departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    UNIQUE NOT NULL,
    manager_id  INTEGER DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(manager_id) REFERENCES Employees(id)
);

-- إضافة عمود department_id إلى الموظفين
ALTER TABLE Employees ADD COLUMN department_id INTEGER REFERENCES Departments(id);

-- (اختياري) نقل البيانات القديمة إن وجدت
INSERT INTO Departments (name) SELECT DISTINCT department FROM Employees WHERE department IS NOT NULL AND department != '';
UPDATE Employees SET department_id = (SELECT id FROM Departments WHERE Departments.name = Employees.department) WHERE department IS NOT NULL;
