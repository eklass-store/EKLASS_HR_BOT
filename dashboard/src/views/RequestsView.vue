<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-xl font-bold leading-6 text-gray-900">إدارة الطلبات</h3>
      <p class="mt-1 text-sm text-gray-500">مراجعة طلبات الإجازات والسلف واتخاذ إجراء بشأنها.</p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
        <button
          @click="activeTab = 'leaves'"
          :class="[
            activeTab === 'leaves'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          طلبات الإجازات
          <span v-if="pendingLeavesCount > 0" class="mr-2 bg-red-100 text-red-600 py-0.5 px-2.5 rounded-full text-xs">{{ pendingLeavesCount }}</span>
        </button>
        <button
          @click="activeTab = 'loans'"
          :class="[
            activeTab === 'loans'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          طلبات السلف
          <span v-if="pendingLoansCount > 0" class="mr-2 bg-red-100 text-red-600 py-0.5 px-2.5 rounded-full text-xs">{{ pendingLoansCount }}</span>
        </button>
      </nav>
    </div>

    <!-- Leaves Tab -->
    <div v-if="activeTab === 'leaves'" class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">النوع والسبب</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الحالة / بواسطة</th>
              <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="leaves.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">لا يوجد طلبات إجازة حالياً.</td>
            </tr>
            <tr v-for="leave in leaves" :key="leave.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ leave.full_name }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">
                <span class="font-bold text-gray-900">{{ translateType(leave.type) }}</span><br/>
                {{ leave.reason || 'لم يتم تحديد سبب' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium" dir="ltr" style="text-align: right;">
                {{ leave.start_date }} <br/> {{ leave.end_date }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col space-y-1">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit"
                    :class="{
                      'bg-yellow-50 text-yellow-700 border-yellow-200': leave.status === 'pending',
                      'bg-green-50 text-green-700 border-green-200': leave.status === 'approved',
                      'bg-red-50 text-red-700 border-red-200': leave.status === 'rejected'
                    }">
                    {{ translateStatus(leave.status) }}
                  </span>
                  <span v-if="leave.approved_by_name" class="text-xs text-gray-500 font-medium">بواسطة: {{ leave.approved_by_name }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                <div v-if="leave.status === 'pending'" class="space-x-2 space-x-reverse flex justify-end">
                  <button @click="updateLeaveStatus(leave.id, 'approved')" class="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1.5 rounded-md transition-colors border border-green-100">موافقة</button>
                  <button @click="updateLeaveStatus(leave.id, 'rejected')" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-md transition-colors border border-red-100">رفض</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loans Tab -->
    <div v-if="activeTab === 'loans'" class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">السبب</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الحالة / بواسطة</th>
              <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="loans.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">لا يوجد طلبات سلف حالياً.</td>
            </tr>
            <tr v-for="loan in loans" :key="loan.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ loan.full_name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ loan.amount.toLocaleString() }} ج.م</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ loan.reason || 'غير محدد' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col space-y-1">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit"
                    :class="{
                      'bg-yellow-50 text-yellow-700 border-yellow-200': loan.status === 'pending',
                      'bg-green-50 text-green-700 border-green-200': loan.status === 'approved',
                      'bg-red-50 text-red-700 border-red-200': loan.status === 'rejected',
                      'bg-gray-50 text-gray-700 border-gray-200': loan.status === 'paid'
                    }">
                    {{ translateStatus(loan.status) }}
                  </span>
                  <span v-if="loan.approved_by_name" class="text-xs text-gray-500 font-medium">بواسطة: {{ loan.approved_by_name }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                <div v-if="loan.status === 'pending'" class="space-x-2 space-x-reverse flex justify-end">
                  <button @click="updateLoanStatus(loan.id, 'approved')" class="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1.5 rounded-md transition-colors border border-green-100">موافقة</button>
                  <button @click="updateLoanStatus(loan.id, 'rejected')" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-md transition-colors border border-red-100">رفض</button>
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
import { ref, onMounted, computed } from 'vue'
import { apiFetch } from '../api/client'
import { useAuthStore } from '../stores/auth'

const activeTab = ref<'leaves' | 'loans'>('leaves')

const leaves = ref<any[]>([])
const loans = ref<any[]>([])
const loading = ref(true)
const authStore = useAuthStore()

const pendingLeavesCount = computed(() => leaves.value.filter(l => l.status === 'pending').length)
const pendingLoansCount = computed(() => loans.value.filter(l => l.status === 'pending').length)

const loadData = async () => {
  loading.value = true
  try {
    const [leavesData, loansData] = await Promise.all([
      apiFetch('/admin/leaves'),
      apiFetch('/admin/loans')
    ])
    leaves.value = leavesData
    loans.value = loansData
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'approved': 'مقبول',
    'rejected': 'مرفوض',
    'paid': 'مسددة'
  }
  return map[status] || status
}

const translateType = (type: string) => {
  const map: Record<string, string> = {
    'annual': 'سنوية',
    'sick': 'مرضية',
    'unpaid': 'بدون راتب'
  }
  return map[type] || type
}

const updateLeaveStatus = async (id: number, status: string) => {
  if (!confirm(`هل أنت متأكد من ${status === 'approved' ? 'الموافقة على' : 'رفض'} هذه الإجازة؟`)) return
  try {
    await apiFetch(`/admin/leaves/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
    await loadData()
  } catch (err) {
    alert('حدث خطأ أثناء تحديث الحالة')
  }
}

const updateLoanStatus = async (id: number, status: string) => {
  if (!confirm(`هل أنت متأكد من ${status === 'approved' ? 'الموافقة على' : 'رفض'} هذه السلفة؟`)) return
  try {
    await apiFetch(`/admin/loans/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
    await loadData()
  } catch (err) {
    alert('حدث خطأ أثناء تحديث الحالة')
  }
}

onMounted(() => {
  loadData()
})
</script>
