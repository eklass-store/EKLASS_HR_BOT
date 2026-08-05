<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">سجل أخطاء النظام</h1>
        <p class="text-sm text-gray-500 mt-1">عرض الأخطاء البرمجية الحرجة وحذفها.</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="selectedIds.length > 0"
          @click="deleteSelected"
          class="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors font-bold text-sm"
        >
          <Trash2 class="w-4 h-4" />
          حذف المحدد ({{ selectedIds.length }})
        </button>
        <button
          @click="fetchLogs"
          class="flex items-center justify-center p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          title="تحديث"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- State: Loading -->
    <div v-if="loading" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-400">
      <Loader2 class="w-8 h-8 animate-spin mb-4 text-primary-500" />
      <p class="font-medium">جاري تحميل السجلات...</p>
    </div>

    <!-- State: Error -->
    <div v-else-if="error" class="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center">
      <AlertCircle class="w-8 h-8 mb-2" />
      <p class="font-bold">{{ error }}</p>
      <button @click="fetchLogs" class="mt-4 px-4 py-2 bg-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 transition-colors">
        إعادة المحاولة
      </button>
    </div>

    <!-- State: Empty -->
    <div v-else-if="logs.length === 0" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-400">
      <ShieldCheck class="w-12 h-12 mb-4 text-emerald-400" />
      <p class="font-bold text-lg text-gray-900">لا توجد أخطاء</p>
      <p class="text-sm mt-1">النظام يعمل بشكل سليم وخالي من الأخطاء الحرجة حالياً.</p>
    </div>

    <!-- State: Success -->
    <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-100">
          <thead class="bg-gray-50/50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="selectedIds.length === logs.length"
                  @change="toggleSelectAll"
                />
              </th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                الإجراء
              </th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                التفاصيل
              </th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-40">
                التاريخ
              </th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                حذف
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50/50 transition-colors" :class="{'bg-red-50/20': selectedIds.includes(log.id)}">
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :value="log.id"
                  v-model="selectedIds"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900 font-mono text-left dir-ltr whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                  {{ log.details }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(log.created_at).toLocaleString('ar-EG') }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="deleteSingle(log.id)"
                  class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                  title="حذف هذا السجل"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
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
import { RefreshCw, Loader2, AlertCircle, Trash2, ShieldCheck } from 'lucide-vue-next'
import { api } from '../api/client'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const { showToast } = useToast()
const { confirm } = useConfirm()

interface AuditLog {
  id: number
  admin_id: number
  action: string
  details: string
  created_at: string
}

const logs = ref<AuditLog[]>([])
const loading = ref(true)
const error = ref('')
const selectedIds = ref<number[]>([])

const fetchLogs = async () => {
  loading.value = true
  error.value = ''
  selectedIds.value = []
  try {
    logs.value = await api.get('/admin/audit-logs')
  } catch (err: any) {
    error.value = err.message || 'فشل تحميل السجلات'
  } finally {
    loading.value = false
  }
}

const toggleSelectAll = (e: Event) => {
  const isChecked = (e.target as HTMLInputElement).checked
  if (isChecked) {
    selectedIds.value = logs.value.map(l => l.id)
  } else {
    selectedIds.value = []
  }
}

const deleteSelected = async () => {
  if (selectedIds.value.length === 0) return
  
  const confirmed = await confirm({
    title: 'تأكيد الحذف',
    message: `هل أنت متأكد من حذف ${selectedIds.value.length} سجل؟`,
    confirmText: 'نعم، احذف',
    confirmColor: 'red'
  })
  
  if (!confirmed) return
  
  try {
    // Delete accepts { ids: [] }
    await api.request('/admin/audit-logs', {
      method: 'DELETE',
      body: JSON.stringify({ ids: selectedIds.value })
    })
    showToast(`تم حذف ${selectedIds.value.length} سجل بنجاح`, 'success')
    fetchLogs()
  } catch (err: any) {
    showToast(err.message || 'فشل الحذف', 'error')
  }
}

const deleteSingle = async (id: number) => {
  const confirmed = await confirm({
    title: 'تأكيد الحذف',
    message: `هل أنت متأكد من حذف هذا السجل؟`,
    confirmText: 'نعم، احذف',
    confirmColor: 'red'
  })
  
  if (!confirmed) return
  
  try {
    await api.request('/admin/audit-logs', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [id] })
    })
    showToast('تم الحذف بنجاح', 'success')
    fetchLogs()
  } catch (err: any) {
    showToast(err.message || 'فشل الحذف', 'error')
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.dir-ltr {
  direction: ltr;
}
</style>
