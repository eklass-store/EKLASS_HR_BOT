<template>
  <div class="space-y-6">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-xl font-bold leading-6 text-gray-900">الرواتب</h3>
        <p class="mt-1 text-sm text-gray-500">إدارة كشوف الرواتب الشهرية وإصدارها.</p>
      </div>
      <div class="mt-4 sm:mt-0 flex gap-3">
        <input 
          type="month" 
          v-model="selectedMonth" 
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          @change="loadPayrolls"
        />
        <button 
          @click="issuePayroll" 
          :disabled="issuing"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
        >
          {{ issuing ? 'جاري الإصدار...' : 'إصدار رواتب الشهر' }}
        </button>
      </div>
    </div>

    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الأساسي</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الخصومات</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الصافي</th>
              <th scope="col" class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">حالة الاستلام</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="payrolls.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">لا يوجد سجلات رواتب لهذا الشهر. قم بإصدار الرواتب.</td>
            </tr>
            <tr v-for="payroll in payrolls" :key="payroll.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ payroll.full_name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ payroll.base_salary.toFixed(2) }} ج.م</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">{{ payroll.total_deductions.toFixed(2) }} ج.م</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{{ payroll.net_salary.toFixed(2) }} ج.م</td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span v-if="payroll.is_confirmed" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  تم الاستلام ({{ new Date(payroll.confirmed_at).toLocaleDateString('ar-EG') }})
                </span>
                <span v-else class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  في انتظار التأكيد
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api/client'

const d = new Date();
const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const selectedMonth = ref(currentMonthStr);
const payrolls = ref<any[]>([]);
const loading = ref(true);
const issuing = ref(false);

const loadPayrolls = async () => {
  loading.value = true;
  try {
    const data = await apiFetch(`/admin/payroll?month=${selectedMonth.value}`);
    payrolls.value = data || [];
  } catch (error) {
    console.error('Error fetching payrolls:', error);
  } finally {
    loading.value = false;
  }
};

const issuePayroll = async () => {
  if (!confirm(`هل أنت متأكد من إصدار رواتب شهر ${selectedMonth.value}؟`)) return;
  issuing.value = true;
  try {
    const result = await apiFetch('/admin/payroll/issue', {
      method: 'POST',
      body: JSON.stringify({ month: selectedMonth.value })
    });
    alert(`تم إصدار الرواتب بنجاح! تم إصدار ${result.issuedCount} وتخطي ${result.skippedCount}.`);
    await loadPayrolls();
  } catch (error: any) {
    alert(error.message || 'حدث خطأ أثناء إصدار الرواتب');
  } finally {
    issuing.value = false;
  }
};

onMounted(() => {
  loadPayrolls();
});
</script>
