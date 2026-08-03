<template>
  <div class="space-y-6">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900">Employees</h3>
        <p class="mt-1 text-sm text-gray-500">Manage all registered employees in the system.</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <button class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
          Add Employee
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-5">
        <dt class="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
        <dd class="mt-1 text-3xl font-semibold text-gray-900">{{ stats.employees }}</dd>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
            </tr>
            <tr v-else-if="employees.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">
                No employees found.
              </td>
            </tr>
            <tr v-for="emp in employees" :key="emp.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ emp.full_name }}</div>
                <div class="text-sm text-gray-500">ID: {{ emp.telegram_id }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" 
                  :class="emp.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                  {{ emp.role }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ emp.department || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {{ emp.base_salary.toLocaleString() }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ emp.is_active ? 'Active' : 'Inactive' }}
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

const employees = ref<any[]>([])
const stats = ref<any>({ employees: 0 })
const loading = ref(true)

const loadData = async () => {
  try {
    loading.value = true
    const [empData, statsData] = await Promise.all([
      apiFetch('/employees'),
      apiFetch('/stats')
    ])
    employees.value = empData
    stats.value = statsData
  } catch (err) {
    console.error('Failed to load data', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
