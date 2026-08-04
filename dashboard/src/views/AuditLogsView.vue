<template>
  <div class="space-y-8">
    <div>
      <h3 class="text-xl font-bold leading-6 text-gray-900">سجل التدقيق (Audit Logs)</h3>
      <p class="mt-1 text-sm text-gray-500">متابعة جميع الإجراءات الإدارية التي تمت على النظام.</p>
    </div>

    <!-- Audit Logs Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-right">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">رقم السجل</th>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">المشرف / الإدارة</th>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">الإجراء (Action)</th>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">التفاصيل (Details)</th>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">لا يوجد نشاطات مسجلة حتى الآن.</td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{{ log.id }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ log.admin_name || `Admin ID: ${log.admin_id}` }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ log.details }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" dir="ltr">{{ new Date(log.created_at).toLocaleString('ar-EG') }}</td>
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
import { useToast } from '../composables/useToast'

const toast = useToast()

const logs = ref<any[]>([])
const loading = ref(true)

const loadData = async () => {
  loading.value = true
  try {
    logs.value = await apiFetch('/admin/audit-logs')
  } catch (err) {
    console.error('Failed to load audit logs', err)
    toast.showToast('فشل تحميل سجل التدقيق', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
