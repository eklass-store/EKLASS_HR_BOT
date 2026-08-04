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

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        <!-- الطلبات العاجلة -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock class="w-5 h-5 text-amber-600" />
                طلبات إجازة عاجلة
              </h3>
              <router-link to="/requests" class="text-sm font-medium text-primary-600 hover:text-primary-700">الكل &larr;</router-link>
            </div>
            <ul class="divide-y divide-gray-100">
              <li v-for="leave in pendingLeaves" :key="leave.id" class="px-6 py-4 hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <p class="text-sm font-bold text-gray-900">{{ leave.full_name }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ leave.start_date }} - {{ leave.type === 'annual' ? 'سنوية' : leave.type === 'sick' ? 'مرضية' : 'بدون راتب' }}</p>
                </div>
                <router-link to="/requests" class="text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-md hover:bg-primary-100 transition-colors">مراجعة</router-link>
              </li>
              <li v-if="pendingLeaves.length === 0" class="px-6 py-6 text-center text-sm text-gray-500">لا توجد طلبات إجازة قيد الانتظار.</li>
            </ul>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarSign class="w-5 h-5 text-rose-600" />
                طلبات سلف عاجلة
              </h3>
              <router-link to="/requests" class="text-sm font-medium text-primary-600 hover:text-primary-700">الكل &larr;</router-link>
            </div>
            <ul class="divide-y divide-gray-100">
              <li v-for="loan in pendingLoans" :key="loan.id" class="px-6 py-4 hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <p class="text-sm font-bold text-gray-900">{{ loan.full_name }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ loan.amount.toLocaleString() }} ج.م - {{ loan.reason }}</p>
                </div>
                <router-link to="/requests" class="text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-md hover:bg-primary-100 transition-colors">مراجعة</router-link>
              </li>
              <li v-if="pendingLoans.length === 0" class="px-6 py-6 text-center text-sm text-gray-500">لا توجد طلبات سلف قيد الانتظار.</li>
            </ul>
          </div>
        </div>

        <!-- إجراءات سريعة -->
        <div class="space-y-4">
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h3 class="text-lg font-bold text-gray-900">إجراءات سريعة</h3>
            </div>
            <div class="p-4 grid grid-cols-1 gap-3">
              <router-link to="/payroll" class="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 group transition-colors">
                <span class="flex-1 ml-3 whitespace-nowrap">إصدار الرواتب</span>
              </router-link>
              <router-link to="/broadcast" class="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 group transition-colors">
                <span class="flex-1 ml-3 whitespace-nowrap">إرسال تعميم</span>
              </router-link>
              <router-link to="/employees" class="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 group transition-colors">
                <span class="flex-1 ml-3 whitespace-nowrap">إدارة الموظفين</span>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Users, CheckCircle, Clock, DollarSign } from 'lucide-vue-next'
import StatCard from '../components/StatCard.vue'
import { apiFetch } from '../api/client'

const loading = ref(true)
const stats = ref<any>(null)
const pendingLeaves = ref<any[]>([])
const pendingLoans = ref<any[]>([])
const currentDate = ref(new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()))

onMounted(async () => {
  try {
    const [statsRes, leavesRes, loansRes] = await Promise.all([
      apiFetch('/stats'),
      apiFetch('/admin/leaves?status=pending&limit=3'),
      apiFetch('/admin/loans?status=pending&limit=3')
    ])
    stats.value = statsRes
    pendingLeaves.value = leavesRes
    pendingLoans.value = loansRes
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
})
</script>
