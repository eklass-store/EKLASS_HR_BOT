<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">نظرة عامة</h1>
        <p class="mt-1 text-sm text-gray-500">مرحباً بك في نظام إدارة الموارد البشرية EKLASS HR.</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-gray-500">{{ currentDate }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-10">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
    </div>

    <template v-else>
      <!-- الإحصائيات -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="إجمالي الموظفين" 
          :value="stats?.employees || 0" 
          :icon="Users" 
          colorClass="text-blue-600 bg-blue-50"
        />
        <StatCard 
          title="سجلات الحضور" 
          :value="stats?.attendance_records || 0" 
          :icon="CheckCircle" 
          colorClass="text-emerald-600 bg-emerald-50"
        />
        <StatCard 
          title="إجازات قيد الانتظار" 
          :value="stats?.pending_leaves || 0" 
          :icon="Clock" 
          colorClass="text-amber-600 bg-amber-50"
        />
        <StatCard 
          title="سلف قيد الانتظار" 
          :value="stats?.pending_loans || 0" 
          :icon="DollarSign" 
          colorClass="text-rose-600 bg-rose-50"
        />
      </div>

      <!-- نشاط أخير (مثال سريع للرئيسية) -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-lg font-bold text-gray-900">حضور اليوم (أحدث السجلات)</h3>
          <router-link to="/payroll" class="text-sm font-medium text-primary-600 hover:text-primary-700">عرض الكل &larr;</router-link>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-right">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">الموظف</th>
                <th class="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">وقت الحضور</th>
                <th class="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="record in recentAttendance" :key="record.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.full_name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" dir="ltr">{{ record.check_in_time || '---' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <Badge :status="record.status === 'late' ? 'rejected' : 'approved'" />
                </td>
              </tr>
              <tr v-if="recentAttendance.length === 0">
                <td colspan="3" class="px-6 py-10 text-center text-gray-500">لا يوجد سجلات حضور اليوم حتى الآن</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Users, CheckCircle, Clock, DollarSign } from 'lucide-vue-next'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'
import { apiFetch } from '../api/client'

const loading = ref(true)
const stats = ref<any>(null)
const recentAttendance = ref<any[]>([])
const currentDate = ref(new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()))

onMounted(async () => {
  try {
    const [statsRes, attendanceRes] = await Promise.all([
      apiFetch('/stats'),
      apiFetch('/attendance?limit=5')
    ])
    stats.value = statsRes
    recentAttendance.value = attendanceRes
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
})
</script>
