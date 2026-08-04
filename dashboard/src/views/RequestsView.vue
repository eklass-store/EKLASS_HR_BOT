<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-xl font-bold leading-6 text-gray-900">إدارة الطلبات</h3>
      <p class="mt-1 text-sm text-gray-500">مراجعة طلبات الإجازات والسلف واتخاذ إجراء بشأنها.</p>
    </div>

    <!-- Main Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
        <button
          @click="activeTab = 'leaves'; loadData()"
          :class="[
            activeTab === 'leaves' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          طلبات الإجازات
        </button>
        <button
          @click="activeTab = 'loans'; loadData()"
          :class="[
            activeTab === 'loans' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          طلبات السلف
        </button>
      </nav>
    </div>

    <!-- Status Filters -->
    <div class="flex space-x-2 space-x-reverse mb-4">
      <button 
        v-for="status in ['pending', 'approved', 'rejected']" 
        :key="status"
        @click="activeStatus = status; page = 0; loadData()"
        :class="[
          activeStatus === status ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'px-4 py-2 rounded-md text-sm font-medium transition-colors'
        ]"
      >
        {{ translateStatus(status) }}
      </button>
      <button 
        v-if="activeTab === 'loans'"
        @click="activeStatus = 'paid'; page = 0; loadData()"
        :class="[
          activeStatus === 'paid' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          'px-4 py-2 rounded-md text-sm font-medium transition-colors'
        ]"
      >
        مسددة
      </button>
    </div>

    <!-- Data Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th v-if="activeTab === 'leaves'" scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">النوع والسبب</th>
              <th v-if="activeTab === 'loans'" scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">المبلغ والسبب</th>
              <th v-if="activeTab === 'leaves'" scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الحالة / بواسطة</th>
              <th v-if="activeStatus === 'pending'" scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">لا يوجد بيانات لعرضها.</td>
            </tr>
            <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ item.full_name }}</td>
              
              <td v-if="activeTab === 'leaves'" class="px-6 py-4 text-sm text-gray-500">
                <span class="font-bold text-gray-900">{{ translateType(item.type) }}</span><br/>
                {{ item.reason || 'لم يتم تحديد سبب' }}
              </td>
              
              <td v-if="activeTab === 'loans'" class="px-6 py-4 text-sm text-gray-500">
                <span class="font-bold text-gray-900">{{ item.amount.toLocaleString() }} ج.م</span><br/>
                {{ item.reason || 'غير محدد' }}
              </td>

              <td v-if="activeTab === 'leaves'" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium" dir="ltr" style="text-align: right;">
                {{ item.start_date }} <br/> {{ item.end_date }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col space-y-1">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit"
                    :class="{
                      'bg-yellow-50 text-yellow-700 border-yellow-200': item.status === 'pending',
                      'bg-green-50 text-green-700 border-green-200': item.status === 'approved',
                      'bg-red-50 text-red-700 border-red-200': item.status === 'rejected',
                      'bg-gray-50 text-gray-700 border-gray-200': item.status === 'paid'
                    }">
                    {{ translateStatus(item.status) }}
                  </span>
                  <span v-if="item.approved_by_name" class="text-xs text-gray-500 font-medium">بواسطة: {{ item.approved_by_name }}</span>
                </div>
              </td>

              <td v-if="activeStatus === 'pending'" class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                <div class="space-x-2 space-x-reverse flex justify-end">
                  <button @click="updateStatus(item.id, 'approved')" class="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1.5 rounded-md transition-colors border border-green-100">موافقة</button>
                  <button @click="updateStatus(item.id, 'rejected')" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-md transition-colors border border-red-100">رفض</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <button 
          @click="page++; loadData()" 
          :disabled="items.length < limit || loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          التالي
        </button>
        <span class="text-sm text-gray-500">
          الصفحة {{ page + 1 }}
        </span>
        <button 
          @click="page--; loadData()" 
          :disabled="page === 0 || loading"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          السابق
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api/client'

const activeTab = ref<'leaves' | 'loans'>('leaves')
const activeStatus = ref<string>('pending')

const items = ref<any[]>([])
const loading = ref(false)

const page = ref(0)
const limit = 20

const loadData = async () => {
  loading.value = true
  items.value = []
  try {
    const endpoint = activeTab.value === 'leaves' ? '/admin/leaves' : '/admin/loans'
    const offset = page.value * limit
    const data = await apiFetch(`${endpoint}?status=${activeStatus.value}&limit=${limit}&offset=${offset}`)
    items.value = data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    'pending': 'قيد الانتظار',
    'approved': 'مقبولة',
    'rejected': 'مرفوضة',
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

const updateStatus = async (id: number, status: string) => {
  if (!confirm(`هل أنت متأكد من ${status === 'approved' ? 'الموافقة' : 'الرفض'}؟`)) return
  try {
    const endpoint = activeTab.value === 'leaves' ? `/admin/leaves/${id}/status` : `/admin/loans/${id}/status`
    await apiFetch(endpoint, {
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
