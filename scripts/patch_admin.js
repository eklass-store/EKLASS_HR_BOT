const fs = require('fs');
const file = '/home/adham/.gemini/antigravity-ide/scratch/EKLASS_HR_BOT/backend/api/admin.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `const lateMap = new Map((lateRes.results as any[]).map(r => [r.employee_id, r.total_late || 0]));`,
  `const lateMap = new Map((lateRes.results as any[]).map(r => [r.employee_id, r.total_late || 0]));

      const otRes = await env.DB.prepare("SELECT employee_id, SUM(overtime_minutes) as total_ot FROM Attendance WHERE date LIKE ? GROUP BY employee_id").bind(\`\${month}-%\`).all();
      const otMap = new Map((otRes.results as any[]).map(r => [r.employee_id, r.total_ot || 0]));
      
      const deductionMultiplier = parseFloat(settings['late_deduction_per_minute'] ?? '1');
      const bonusMultiplier = parseFloat(settings['overtime_bonus_per_minute'] ?? '1');`
);

content = content.replace(
  `const lateDeduction = lateMinutes * minuteRate;

        const activeLoan = loansMap.get(employee.id) || 0;

        const availableForLoan = Math.max(0, dynamicMonthSalary - lateDeduction);
        const loanDeducted = Math.min(activeLoan, availableForLoan);

        const totalDed = lateDeduction + loanDeducted;
        const netSalary = Math.max(0, dynamicMonthSalary - totalDed);

        batchStatements.push(
          env.DB.prepare("INSERT INTO Payroll (employee_id, month, base_salary, total_deductions, net_salary, status) VALUES (?, ?, ?, ?, ?, 'issued')")
            .bind(employee.id, month, dynamicMonthSalary, totalDed, netSalary)
        );`,
  `const lateDeduction = lateMinutes * minuteRate * deductionMultiplier;
        
        const overtimeMinutes = otMap.get(employee.id) || 0;
        const overtimeBonus = overtimeMinutes * minuteRate * bonusMultiplier;

        const activeLoan = loansMap.get(employee.id) || 0;

        const availableForLoan = Math.max(0, dynamicMonthSalary - lateDeduction + overtimeBonus);
        const loanDeducted = Math.min(activeLoan, availableForLoan);

        const totalDed = lateDeduction + loanDeducted;
        const netSalary = Math.max(0, dynamicMonthSalary - totalDed + overtimeBonus);

        batchStatements.push(
          env.DB.prepare("INSERT INTO Payroll (employee_id, month, base_salary, total_deductions, total_bonuses, net_salary, status) VALUES (?, ?, ?, ?, ?, ?, 'issued')")
            .bind(employee.id, month, dynamicMonthSalary, totalDed, overtimeBonus, netSalary)
        );`
);

content = content.replace(
  `const msgText = \`💰 *تم إصدار راتبك لشهر \${month}*\\n\\nالراتب الأساسي: \${dynamicMonthSalary} ج.م\\nإجمالي الخصومات/السلف: \${totalDed} ج.م\\n*الصافي المستحق:* \${netSalary} ج.م\\n\\nهل استلمت راتبك يداً بيد؟\`;`,
  `let msgText = \`💰 *تم إصدار راتبك لشهر \${month}*\\n\\nالراتب الأساسي: \${dynamicMonthSalary.toFixed(2)} ج.م\\n\`;
          if (overtimeBonus > 0) msgText += \`الإضافي: \${overtimeBonus.toFixed(2)} ج.م\\n\`;
          msgText += \`إجمالي الخصومات/السلف: \${totalDed.toFixed(2)} ج.م\\n*الصافي المستحق:* \${netSalary.toFixed(2)} ج.م\\n\\nهل استلمت راتبك يداً بيد؟\`;`
);

fs.writeFileSync(file, content);
