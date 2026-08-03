<template>
  <div class="space-y-8">
    <div>
      <h3 class="text-lg font-medium leading-6 text-gray-900">System Settings</h3>
      <p class="mt-1 text-sm text-gray-500">Manage work hours, deductions, and official holidays.</p>
    </div>

    <!-- General Settings -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 p-6 max-w-3xl">
      <h4 class="text-md font-medium text-gray-900 mb-4">Work Rules</h4>
      
      <div v-if="loading" class="text-sm text-gray-500">Loading...</div>
      
      <div v-else class="space-y-4">
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">Work Start Time</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input type="time" v-model="settings.work_start_time" class="flex-1 min-w-0 block w-full px-3 py-2 rounded-md sm:text-sm border-gray-300 border focus:ring-black focus:border-black">
              <button @click="updateSetting('work_start_time', settings.work_start_time)" class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800">Save</button>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Work End Time</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input type="time" v-model="settings.work_end_time" class="flex-1 min-w-0 block w-full px-3 py-2 rounded-md sm:text-sm border-gray-300 border focus:ring-black focus:border-black">
              <button @click="updateSetting('work_end_time', settings.work_end_time)" class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800">Save</button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Late Deduction (Per Minute)</label>
            <div class="mt-1 flex rounded-md shadow-sm">
              <input type="number" step="0.1" v-model="settings.late_deduction_per_minute" class="flex-1 min-w-0 block w-full px-3 py-2 rounded-md sm:text-sm border-gray-300 border focus:ring-black focus:border-black">
              <button @click="updateSetting('late_deduction_per_minute', settings.late_deduction_per_minute)" class="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Holidays -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden max-w-3xl">
      <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">Official Holidays</h3>
      </div>
      
      <div class="p-4 border-b border-gray-100 bg-white">
        <form @submit.prevent="addHoliday" class="flex space-x-4 items-end">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" v-model="newHoliday.date" required class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm">
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" v-model="newHoliday.description" placeholder="e.g. Eid, National Day" required class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm">
          </div>
          <div>
            <button type="submit" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800">
              Add Holiday
            </button>
          </div>
        </form>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="holidays.length === 0">
              <td colspan="3" class="px-6 py-10 text-center text-sm text-gray-500">No holidays found.</td>
            </tr>
            <tr v-for="holiday in holidays" :key="holiday.holiday_date" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ holiday.holiday_date }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ holiday.description }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="removeHoliday(holiday.holiday_date)" class="text-red-600 hover:text-red-900">Remove</button>
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

const settings = ref<Record<string, string>>({})
const holidays = ref<any[]>([])
const loading = ref(true)

const newHoliday = ref({ date: '', description: '' })

const loadData = async () => {
  loading.value = true
  try {
    const [settingsData, holidaysData] = await Promise.all([
      apiFetch('/admin/settings'),
      apiFetch('/admin/holidays')
    ])
    settings.value = settingsData
    holidays.value = holidaysData
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const updateSetting = async (key: string, value: string) => {
  try {
    await apiFetch('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value })
    })
    alert('Setting updated successfully')
  } catch (err) {
    alert('Failed to update setting')
  }
}

const addHoliday = async () => {
  try {
    await apiFetch('/admin/holidays', {
      method: 'POST',
      body: JSON.stringify(newHoliday.value)
    })
    newHoliday.value = { date: '', description: '' }
    await loadData()
  } catch (err: any) {
    alert(err.message || 'Failed to add holiday')
  }
}

const removeHoliday = async (date: string) => {
  if (!confirm('Remove this holiday?')) return
  try {
    await apiFetch(`/admin/holidays/${date}`, {
      method: 'DELETE'
    })
    await loadData()
  } catch (err) {
    alert('Failed to remove holiday')
  }
}

onMounted(() => {
  loadData()
})
</script>
