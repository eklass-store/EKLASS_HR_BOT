<template>
  <div class="space-y-6">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-xl font-bold leading-6 text-gray-900">الحضور والرواتب</h3>
        <p class="mt-1 text-sm text-gray-500">عرض أحدث سجلات الحضور، وتصدير كشوف الرواتب الشهرية.</p>
      </div>
      <div class="mt-4 sm:mt-0 flex gap-3">
        <input type="month" v-model="exportMonth" class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-4 py-2 border font-medium">
        <button @click="exportPayroll" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 whitespace-nowrap transition-colors">
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          تصدير لإكسل
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-200 bg-gray-50">
        <h4 class="text-base font-bold text-gray-900">سجلات الحضور الأخيرة (آخر 50)</h4>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-white">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">التاريخ</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الموظف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">وقت الحضور</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">وقت الانصراف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">الحالة</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">
                لا توجد سجلات حضور.
              </td>
            </tr>
            <tr v-for="rec in records" :key="rec.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold" dir="ltr" style="text-align: right;">
                {{ rec.date }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                {{ rec.full_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium" dir="ltr" style="text-align: right;">
                {{ rec.check_in_time || '--:--' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium" dir="ltr" style="text-align: right;">
                {{ rec.check_out_time || '--:--' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="{
                    'bg-green-50 text-green-700 border-green-200': rec.status === 'present',
                    'bg-yellow-50 text-yellow-700 border-yellow-200': rec.status === 'late',
                    'bg-red-50 text-red-700 border-red-200': rec.status === 'absent'
                  }">
                  {{ translateStatus(rec.status) }}
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
import { useAuthStore } from '../stores/auth'

const records = ref<any[]>([])
const loading = ref(true)
const exportMonth = ref(new Date().toISOString().slice(0, 7))
const authStore = useAuthStore()

const loadData = async () => {
  try {
    loading.value = true
    records.value = await apiFetch('/attendance?limit=50')
  } catch (err) {
    console.error('Failed to load records', err)
  } finally {
    loading.value = false
  }
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    'present': 'حاضر',
    'late': 'متأخر',
    'absent': 'غائب'
  }
  return map[status] || status
}

const exportPayroll = () => {
  if (!exportMonth.value) return
  const API_BASE = import.meta.env.VITE_API_URL || '/api'
  
  fetch(`${API_BASE}/export/monthly?month=${exportMonth.value}`, {
    headers: {
      'Authorization': `Bearer ${authStore.token}`
    }
  })
  .then(res => {
    if (!res.ok) throw new Error('فشل التصدير')
    return res.blob()
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `كشف_رواتب_${exportMonth.value}.xlsx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
  })
  .catch(err => alert(err.message))
}

onMounted(() => {
  loadData()
})
</script>
