const fs = require('fs');
const file = '/home/adham/.gemini/antigravity-ide/scratch/EKLASS_HR_BOT/dashboard/src/views/ReportsView.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Payroll stats state
content = content.replace(
  `const totalLateMinutes = ref(0)`,
  `const totalLateMinutes = ref(0)\nconst payrollStatus = ref('لم يصدر')\nconst totalPayrollPaid = ref(0)`
);

// 2. Add Payroll card in UI
const payrollCard = `
        <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
          <div class="flex items-center relative z-10">
            <div class="p-3 rounded-xl bg-blue-100 text-blue-600 ml-4">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-500">رواتب الفترة المحددة</p>
              <p class="mt-1 text-xl font-black text-gray-900">{{ totalPayrollPaid.toLocaleString() }} ج.م</p>
              <p class="text-xs mt-1" :class="payrollStatus === 'تم الإصدار' ? 'text-green-600 font-bold' : 'text-red-500'">الحالة: {{ payrollStatus }}</p>
            </div>
          </div>
        </div>
`;
content = content.replace(`        <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50`, payrollCard + `\n        <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">\n          <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50`);

// 3. Change grid cols to 5 for xl screens
content = content.replace(`class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"`, `class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6"`);

// 4. Fetch payroll data
content = content.replace(
  `const fetchAttendance = async () => {`,
  `const allPayrolls = ref<any[]>([]);

const fetchAttendance = async () => {`
);

content = content.replace(
  `const attRes = await apiFetch(url);`,
  `const attRes = await apiFetch(url);
    
    // Fetch payroll if dates are selected
    if (selectedStartDate.value) {
      const monthStr = selectedStartDate.value.substring(0, 7);
      const payRes = await apiFetch('/admin/payroll?month=' + monthStr);
      allPayrolls.value = payRes || [];
    } else {
      allPayrolls.value = [];
    }`
);

// 5. Process payroll data
content = content.replace(
  `// Calculate stats`,
  `// Calculate stats
  if (allPayrolls.value.length > 0) {
    payrollStatus.value = 'تم الإصدار';
    totalPayrollPaid.value = allPayrolls.value.reduce((sum, p) => sum + (Number(p.net_salary) || 0), 0);
  } else {
    payrollStatus.value = 'لم يصدر';
    totalPayrollPaid.value = 0;
  }
`
);

fs.writeFileSync(file, content);
