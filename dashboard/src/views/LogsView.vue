<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">سجل حركات النظام</h1>
        <p class="text-sm text-gray-500 mt-1">عرض ومتابعة كافة الإجراءات الإدارية والأخطاء التقنية.</p>
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
      <p class="font-bold text-lg text-gray-900">سجل النظام فارغ</p>
      <p class="text-sm mt-1">لم يتم تسجيل أي حركات أو أخطاء حتى الآن.</p>
    </div>

    <!-- State: Success -->
    <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
        <span>إجمالي السجلات: {{ totalLogs }}</span>
        <div class="flex items-center gap-2">
          <button @click="previousPage" :disabled="page === 0 || loading" class="px-3 py-1 rounded-lg border disabled:opacity-40">السابق</button>
          <span>صفحة {{ page + 1 }}</span>
          <button @click="nextPage" :disabled="!hasMore || loading" class="px-3 py-1 rounded-lg border disabled:opacity-40">التالي</button>
        </div>
      </div>
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
            <template v-for="log in logs" :key="log.id">
              <tr class="hover:bg-gray-50/50 transition-colors" :class="{'bg-red-50/20': selectedIds.includes(log.id)}">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    :value="log.id"
                    v-model="selectedIds"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <component :is="getActionMeta(log.action).icon" class="w-5 h-5" :class="`text-${getActionMeta(log.action).color}-500`" />
                    <span :class="`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getActionMeta(log.action).color}-100 text-${getActionMeta(log.action).color}-800`">
                      {{ getActionMeta(log.action).label }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-between gap-4">
                    <span class="text-sm text-gray-900 truncate max-w-xs">{{ log.details.split('\n')[0].substring(0, 50) }}...</span>
                    <button @click="toggleExpand(log.id)" class="text-gray-400 hover:text-primary-600 transition-colors text-xs font-bold flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                      <span v-if="expandedLog === log.id">إخفاء</span>
                      <span v-else>عرض التفاصيل</span>
                      <ChevronUp v-if="expandedLog === log.id" class="w-3 h-3" />
                      <ChevronDown v-else class="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div class="flex flex-col">
                    <span class="font-medium text-gray-900">{{ log.admin_name || 'النظام' }}</span>
                    <span class="text-xs text-gray-400">{{ new Date(log.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                  </div>
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
              <tr v-if="expandedLog === log.id">
                <td colspan="5" class="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                  <div class="text-sm text-gray-900 font-mono text-left dir-ltr whitespace-pre-wrap bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-h-64 overflow-y-auto">
                    {{ log.details }}
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw, Loader2, AlertCircle, Trash2, ShieldCheck, ChevronDown, ChevronUp, UserPlus, UserCog, UserMinus, CheckCircle, XCircle, Megaphone, Settings, CalendarPlus, CalendarMinus, FolderPlus, FolderEdit, FolderMinus, MessageSquare, Activity } from 'lucide-vue-next'
import { apiFetch } from '../api/client'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const { showToast } = useToast()
const { confirm } = useConfirm()

interface AuditLog {
  id: number
  admin_id: number
  admin_name?: string
  action: string
  details: string
  created_at: string
}

const logs = ref<AuditLog[]>([])
const totalLogs = ref(0)
const page = ref(0)
const pageSize = 50
const hasMore = ref(false)
const loading = ref(true)
const error = ref('')
const selectedIds = ref<number[]>([])
const expandedLog = ref<number | null>(null)

const actionMap: Record<string, { label: string, color: string, icon: any }> = {
  WEBHOOK_ERROR: { label: 'خطأ تقني', color: 'red', icon: AlertCircle },
  WEBHOOK_CRITICAL_ERROR: { label: 'خطأ حرج', color: 'red', icon: AlertCircle },
  SALARY_CONFIRM_ERROR: { label: 'خطأ الراتب', color: 'red', icon: AlertCircle },
  ADD_EMPLOYEE: { label: 'إضافة موظف', color: 'emerald', icon: UserPlus },
  UPDATE_EMPLOYEE: { label: 'تعديل موظف', color: 'blue', icon: UserCog },
  DELETE_EMPLOYEE: { label: 'إيقاف موظف', color: 'orange', icon: UserMinus },
  APPROVE_LOAN: { label: 'موافقة سلفة', color: 'emerald', icon: CheckCircle },
  REJECT_LOAN: { label: 'رفض سلفة', color: 'rose', icon: XCircle },
  APPROVE_LEAVE: { label: 'موافقة إجازة', color: 'emerald', icon: CheckCircle },
  REJECT_LEAVE: { label: 'رفض إجازة', color: 'rose', icon: XCircle },
  BROADCAST: { label: 'بث إعلان', color: 'indigo', icon: Megaphone },
  UPDATE_SETTING: { label: 'تعديل إعدادات', color: 'gray', icon: Settings },
  ADD_HOLIDAY: { label: 'إضافة عطلة', color: 'emerald', icon: CalendarPlus },
  DELETE_HOLIDAY: { label: 'حذف عطلة', color: 'orange', icon: CalendarMinus },
  ADD_DEPARTMENT: { label: 'إضافة قسم', color: 'blue', icon: FolderPlus },
  UPDATE_DEPARTMENT: { label: 'تعديل قسم', color: 'blue', icon: FolderEdit },
  DELETE_DEPARTMENT: { label: 'حذف قسم', color: 'orange', icon: FolderMinus },
  SEND_MESSAGE: { label: 'إرسال رسالة', color: 'indigo', icon: MessageSquare }
}

const getActionMeta = (action: string) => {
  return actionMap[action] || { label: action, color: 'gray', icon: Activity }
}

const toggleExpand = (id: number) => {
  expandedLog.value = expandedLog.value === id ? null : id
}

const fetchLogs = async () => {
  loading.value = true
  error.value = ''
  selectedIds.value = []
  try {
    const response = await apiFetch(`/admin/audit-logs?limit=${pageSize}&offset=${page.value * pageSize}`)
    logs.value = response.items || []
    totalLogs.value = Number(response.pagination?.total || 0)
    hasMore.value = Boolean(response.pagination?.hasMore)
  } catch (err: any) {
    error.value = err.message || 'فشل تحميل السجلات'
  } finally {
    loading.value = false
  }
}

const previousPage = () => {
  if (page.value > 0) {
    page.value -= 1
    fetchLogs()
  }
}

const nextPage = () => {
  if (hasMore.value) {
    page.value += 1
    fetchLogs()
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
    await apiFetch('/admin/audit-logs', {
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
    await apiFetch('/admin/audit-logs', {
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
