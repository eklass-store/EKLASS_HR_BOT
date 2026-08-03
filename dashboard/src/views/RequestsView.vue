<template>
  <div class="space-y-8">
    <div>
      <h3 class="text-xl font-bold leading-6 text-gray-900">إدارة الطلبات</h3>
      <p class="mt-1 text-sm text-gray-500">مراجعة طلبات الإجازات والسلف المقدمة من الموظفين واتخاذ إجراء بشأنها.</p>
    </div>

    <!-- Leaves -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-bold text-gray-900">طلبات الإجازات</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-white">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">النوع والسبب</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الحالة</th>
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
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium" dir="ltr" style="text-align: right;">{{ leave.start_date }} <br/> {{ leave.end_date }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="{
                    'bg-yellow-50 text-yellow-700 border-yellow-200': leave.status === 'pending',
                    'bg-green-50 text-green-700 border-green-200': leave.status === 'approved',
                    'bg-red-50 text-red-700 border-red-200': leave.status === 'rejected'
                  }">
                  {{ translateStatus(leave.status) }}
                </span>
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

    <!-- Loans -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-bold text-gray-900">طلبات السلف</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-white">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">المبلغ</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">السبب</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الحالة</th>
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
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="{
                    'bg-yellow-50 text-yellow-700 border-yellow-200': loan.status === 'pending',
                    'bg-green-50 text-green-700 border-green-200': loan.status === 'approved',
                    'bg-red-50 text-red-700 border-red-200': loan.status === 'rejected'
                  }">
                  {{ translateStatus(loan.status) }}
                </span>
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
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api/client'

const leaves = ref<any[]>([])
const loans = ref<any[]>([])
const loading = ref(true)

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
    'rejected': 'مرفوض'
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
