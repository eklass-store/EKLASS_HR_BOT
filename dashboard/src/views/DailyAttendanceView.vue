<template>
  <div class="space-y-6 pb-12">
    <div class="sm:flex sm:items-center sm:justify-between mb-8">
      <div>
        <h3 class="text-2xl font-black leading-6 text-gray-900 tracking-wider">الحضور اليومي</h3>
        <p class="mt-2 text-sm text-gray-500 font-medium">متابعة الحضور والغياب لجميع الموظفين ليوم محدد.</p>
      </div>
      <div class="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 items-center">
        <div class="relative">
          <label class="sr-only">تاريخ الحضور</label>
          <input 
            type="date" 
            v-model="selectedDate" 
            class="block w-full rounded-lg border-gray-300 pr-10 text-gray-900 focus:border-primary-500 focus:ring-primary-500 text-sm py-2"
          />
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 font-medium">إجمالي الموظفين</p>
          <p class="text-2xl font-bold text-gray-900">{{ totalEmployees }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-green-600 font-medium">حضور طبيعي</p>
          <p class="text-2xl font-bold text-gray-900">{{ presentEmployees }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-yellow-600 font-medium">تأخير</p>
          <p class="text-2xl font-bold text-gray-900">{{ lateEmployees }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-sm text-red-600 font-medium">غياب</p>
          <p class="text-2xl font-bold text-gray-900">{{ absentEmployees }}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">القسم</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">وقت الحضور</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">وقت الانصراف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">تأخير / إضافي</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="6" class="px-6 py-10 text-center text-sm text-gray-500">لا يوجد موظفين نشطين لعرضهم.</td>
            </tr>
            <tr v-for="record in records" :key="record.employee_id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">{{ record.full_name }}</div>
                <div class="text-xs text-gray-500 font-mono mt-1">ID: {{ record.employee_id }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                {{ record.department_name || 'بدون قسم' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border"
                  :class="{
                    'bg-green-50 text-green-700 border-green-200': record.status === 'present',
                    'bg-yellow-50 text-yellow-700 border-yellow-200': record.status === 'late',
                    'bg-red-50 text-red-700 border-red-200': record.status === 'absent'
                  }">
                  {{ 
                    record.status === 'present' ? '✅ حضور طبيعي' : 
                    record.status === 'late' ? '⚠️ تأخير' : 
                    '❌ غياب' 
                  }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium" dir="ltr">
                {{ record.check_in_time ? formatTime(record.check_in_time) : '--:--' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium" dir="ltr">
                {{ record.check_out_time ? formatTime(record.check_out_time) : '--:--' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col space-y-1">
                  <span v-if="record.late_minutes > 0" class="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 w-fit">
                    +{{ record.late_minutes }} دقيقة تأخير
                  </span>
                  <span v-if="record.overtime_minutes > 0" class="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100 w-fit">
                    +{{ record.overtime_minutes }} دقيقة إضافي
                  </span>
                  <span v-if="!record.late_minutes && !record.overtime_minutes" class="text-xs text-gray-400">لا يوجد</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiFetch } from '../api/client'

const loading = ref(true)
const records = ref<any[]>([])

// Default to today
const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)

const loadData = async () => {
  loading.value = true
  try {
    const data = await apiFetch(`/attendance/daily?date=${selectedDate.value}`)
    records.value = data
  } catch (error) {
    console.error('Error fetching daily attendance:', error)
  } finally {
    loading.value = false
  }
}

// Stats
const totalEmployees = computed(() => records.value.length)
const presentEmployees = computed(() => records.value.filter(r => r.status === 'present').length)
const lateEmployees = computed(() => records.value.filter(r => r.status === 'late').length)
const absentEmployees = computed(() => records.value.filter(r => r.status === 'absent').length)

// Format time from timestamp/string to HH:MM AM/PM
const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--'
  try {
    const d = new Date(timeStr)
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return timeStr
  }
}

watch(selectedDate, () => {
  if (selectedDate.value) loadData()
})

onMounted(() => {
  loadData()
})
</script>
