// ============================================================
// src/utils/payroll.ts
// ============================================================

export interface PayrollInput {
  base_salary: number;
  workMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  activeLoan: number;
  absenceDays?: number;
  absenceDeductionPerDay?: number;
  daysInMonth: number;
  deductionMultiplier?: number;
  bonusMultiplier?: number;
}

export interface PayrollCalculation {
  dynamicMonthSalary: number;
  dailyRate: number;
  minuteRate: number;
  lateDeduction: number;
  overtimeBonus: number;
  absenceDeduction: number;
  availableForLoan: number;
  loanDeducted: number;
  totalDed: number;
  netSalary: number;
}

export function calculatePayroll(input: PayrollInput): PayrollCalculation {
  const {
    base_salary,
    workMinutes,
    lateMinutes,
    overtimeMinutes,
    activeLoan,
    absenceDays = 0,
    absenceDeductionPerDay = 0,
    daysInMonth,
    deductionMultiplier = 1,
    bonusMultiplier = 1,
  } = input;

  const dynamicMonthSalary = base_salary; // Fixed monthly salary
  const dailyRate = daysInMonth > 0 ? base_salary / daysInMonth : 0;
  const minuteRate = workMinutes > 0 ? dailyRate / workMinutes : 0;

  const lateDeduction = lateMinutes * minuteRate * deductionMultiplier;
  const overtimeBonus = overtimeMinutes * minuteRate * bonusMultiplier;
  const absenceDeduction = Math.max(0, absenceDays) * Math.max(0, absenceDeductionPerDay);

  const availableForLoan = Math.max(0, dynamicMonthSalary - lateDeduction - absenceDeduction + overtimeBonus);
  const loanDeducted = Math.min(activeLoan, availableForLoan);

  const totalDed = lateDeduction + absenceDeduction + loanDeducted;
  const netSalary = Math.max(0, dynamicMonthSalary - totalDed + overtimeBonus);

  return {
    dynamicMonthSalary,
    dailyRate,
    minuteRate,
    lateDeduction,
    overtimeBonus,
    absenceDeduction,
    availableForLoan,
    loanDeducted,
    totalDed,
    netSalary
  };
}
