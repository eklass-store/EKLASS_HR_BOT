const fs = require('fs');
const file = '/home/adham/.gemini/antigravity-ide/scratch/EKLASS_HR_BOT/backend/api/export.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const deductionRate = parseFloat(settings['late_deduction_per_minute'] ?? '1');
  const bonusRate = parseFloat(settings['overtime_bonus_per_minute'] ?? '2');`,
  `const deductionRate = parseFloat(settings['late_deduction_per_minute'] ?? '1');
  const bonusRate = parseFloat(settings['overtime_bonus_per_minute'] ?? '1');
  const startTime = settings['work_start_time'] ?? '09:00';
  const endTime = settings['work_end_time'] ?? '17:00';
  const { calcLateMinutes } = await import('../utils/time');
  const workMinutes = calcLateMinutes(endTime, startTime) || 480;`
);

content = content.replace(
  `const late_deduction = att.late_minutes * deductionRate;
    const overtime_bonus = att.overtime_minutes * bonusRate;
    const base_salary = emp.base_salary || 0;`,
  `const base_salary = emp.base_salary || 0;
    const dailyRate = base_salary / 30;
    const minuteRate = dailyRate / workMinutes;
    const late_deduction = att.late_minutes * minuteRate * deductionRate;
    const overtime_bonus = att.overtime_minutes * minuteRate * bonusRate;`
);

// Also patch exportMonthlyReport to include total_bonuses
content = content.replace(
  `SELECT e.id, e.full_name, e.base_salary, p.total_deductions, p.net_salary, p.status as payroll_status, p.is_confirmed, p.confirmed_at`,
  `SELECT e.id, e.full_name, e.base_salary, p.total_deductions, p.total_bonuses, p.net_salary, p.status as payroll_status, p.is_confirmed, p.confirmed_at`
);

content = content.replace(
  `{ header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'إجمالي الخصومات', key: 'total_deductions', width: 20 },`,
  `{ header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
    { header: 'الإضافي', key: 'total_bonuses', width: 15 },
    { header: 'إجمالي الخصومات', key: 'total_deductions', width: 20 },`
);

content = content.replace(
  `base_salary: row.base_salary,
      total_deductions: row.total_deductions ?? 0,`,
  `base_salary: row.base_salary,
      total_bonuses: row.total_bonuses ?? 0,
      total_deductions: row.total_deductions ?? 0,`
);

fs.writeFileSync(file, content);
