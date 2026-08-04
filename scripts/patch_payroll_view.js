const fs = require('fs');
const file = '/home/adham/.gemini/antigravity-ide/scratch/EKLASS_HR_BOT/dashboard/src/views/PayrollView.vue';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `<th class="px-6 py-4 bg-gray-50 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الخصومات</th>`,
  `<th class="px-6 py-4 bg-gray-50 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الخصومات</th>
<th class="px-6 py-4 bg-gray-50 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الإضافي</th>`
);

content = content.replace(
  `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                  م.ج {{ Number(record.total_deductions || 0).toFixed(2) }}
                </td>`,
  `<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                  م.ج {{ Number(record.total_deductions || 0).toFixed(2) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                  م.ج {{ Number(record.total_bonuses || 0).toFixed(2) }}
                </td>`
);

fs.writeFileSync(file, content);
