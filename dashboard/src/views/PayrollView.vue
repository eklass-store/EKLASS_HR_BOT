<template>
  <div class="space-y-6">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900">Attendance & Payroll</h3>
        <p class="mt-1 text-sm text-gray-500">View recent attendance records and export monthly payroll.</p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <input type="month" v-model="exportMonth" class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm px-3 py-2 border">
        <button @click="exportPayroll" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black whitespace-nowrap">
          Export Excel
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-200">
        <h4 class="text-base font-medium text-gray-900">Recent Attendance (Last 50)</h4>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">
                No attendance records found.
              </td>
            </tr>
            <tr v-for="rec in records" :key="rec.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {{ rec.date }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ rec.full_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ rec.check_in_time || '--:--' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ rec.check_out_time || '--:--' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-800': rec.status === 'present',
                    'bg-yellow-100 text-yellow-800': rec.status === 'late',
                    'bg-red-100 text-red-800': rec.status === 'absent'
                  }">
                  {{ rec.status }}
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

const exportPayroll = () => {
  if (!exportMonth.value) return
  const API_BASE = import.meta.env.VITE_API_URL || '/api'
  // Create a temporary link to download the file directly, passing the JWT if possible
  // Since it's a direct download link, passing JWT in headers isn't natively supported by window.open.
  // Workaround: fetch as blob, then trigger download
  
  fetch(`${API_BASE}/export/monthly?month=${exportMonth.value}`, {
    headers: {
      'Authorization': `Bearer ${authStore.token}`
    }
  })
  .then(res => {
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `Payroll_${exportMonth.value}.xlsx`
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
