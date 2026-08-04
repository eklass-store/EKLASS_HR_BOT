<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <router-link to="/employees" class="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </router-link>
        <div>
          <h2 class="text-2xl font-bold text-gray-900">ملف الموظف</h2>
        </div>
      </div>
      <button 
        v-if="employee"
        @click="showMsgModal = true"
        class="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-sm transition-colors shadow-sm"
      >
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
        إرسال رسالة
      </button>
    </div>

    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-32 bg-gray-200 rounded-xl"></div>
      <div class="h-64 bg-gray-200 rounded-xl"></div>
    </div>
    
    <template v-else-if="employee">
      <!-- بطاقة معلومات الموظف -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div class="flex items-center gap-5">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 text-2xl font-bold shadow-inner">
            {{ employee.full_name.charAt(0) }}
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900">{{ employee.full_name }}</h3>
            <p class="text-sm text-gray-500 mt-1" dir="ltr">TG ID: {{ employee.telegram_id }}</p>
            <div class="flex gap-2 mt-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                {{ employee.role === 'admin' ? 'مشرف' : 'موظف' }}
              </span>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                {{ employee.department_name || 'بدون قسم' }}
              </span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-500">الراتب الأساسي</p>
          <p class="text-2xl font-bold text-gray-900">{{ employee.base_salary.toLocaleString() }} ج.م</p>
          <p class="text-xs text-gray-400 mt-1">تاريخ الانضمام: {{ new Date(employee.created_at).toLocaleDateString('ar-EG') }}</p>
        </div>
      </div>

      <!-- تبويبات التفاصيل -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="border-b border-gray-100 flex overflow-x-auto">
          <button v-for="tab in ['الحضور', 'الإجازات', 'السلف']" :key="tab" @click="activeTab = tab"
            class="px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2"
            :class="activeTab === tab ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
            {{ tab }}
          </button>
        </div>

        <div class="p-6">
          <!-- الحضور -->
          <div v-if="activeTab === 'الحضور'" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-right">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">التاريخ</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">وقت الحضور</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">وقت الانصراف</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">دقائق التأخير</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="att in attendance" :key="att.id">
                  <td class="px-4 py-3 text-sm">{{ att.date }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500" dir="ltr">{{ att.check_in_time || '--:--' }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500" dir="ltr">{{ att.check_out_time || '--:--' }}</td>
                  <td class="px-4 py-3 text-sm font-bold" :class="att.late_minutes > 0 ? 'text-rose-600' : 'text-emerald-600'">
                    {{ att.late_minutes }} د
                  </td>
                </tr>
                <tr v-if="attendance.length === 0">
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">لا يوجد سجلات حضور.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- الإجازات -->
          <div v-if="activeTab === 'الإجازات'" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-right">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">النوع</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">من</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">إلى</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">السبب</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="leave in leaves" :key="leave.id">
                  <td class="px-4 py-3 text-sm font-medium">{{ leave.type === 'annual' ? 'سنوية' : leave.type === 'sick' ? 'مرضية' : 'اضطرارية' }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ leave.start_date }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ leave.end_date }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ leave.reason || '---' }}</td>
                  <td class="px-4 py-3 text-sm"><Badge :status="leave.status" /></td>
                </tr>
                <tr v-if="leaves.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-gray-500">لا يوجد طلبات إجازات.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- السلف -->
          <div v-if="activeTab === 'السلف'" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-right">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">المبلغ</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">السبب</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">تاريخ الطلب</th>
                  <th class="px-4 py-3 text-xs font-bold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="loan in loans" :key="loan.id">
                  <td class="px-4 py-3 text-sm font-bold">{{ loan.amount.toLocaleString() }} ج.م</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ loan.reason }}</td>
                  <td class="px-4 py-3 text-sm text-gray-500">{{ new Date(loan.created_at).toLocaleDateString('ar-EG') }}</td>
                  <td class="px-4 py-3 text-sm"><Badge :status="loan.status" /></td>
                </tr>
                <tr v-if="loans.length === 0">
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">لا يوجد طلبات سلف.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <SendMessageModal 
        :isOpen="showMsgModal"
        :employeeId="employee?.id"
        :employeeName="employee?.full_name"
        @close="showMsgModal = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiFetch } from '../api/client'
import Badge from '../components/Badge.vue'
import SendMessageModal from '../components/SendMessageModal.vue'
import { useToast } from '../composables/useToast'

const route = useRoute()
const { showToast } = useToast()

const loading = ref(true)
const employee = ref<any>(null)
const attendance = ref<any[]>([])
const leaves = ref<any[]>([])
const loans = ref<any[]>([])

const activeTab = ref('الحضور')
const showMsgModal = ref(false)

onMounted(async () => {
  try {
    const data = await apiFetch(`/admin/employees/${route.params.id}`)
    employee.value = data
    attendance.value = data.attendance || []
    leaves.value = data.leaves || []
    loans.value = data.loans || []
  } catch (error) {
    console.error(error)
    showToast('فشل في جلب بيانات الموظف', 'error')
  } finally {
    loading.value = false
  }
})
</script>
