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
            <tr v-if="loading" class="animate-pulse">
              <td colspan="3" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="holidays.length === 0">
              <td colspan="3" class="px-6 py-10 text-center text-sm text-gray-500">لا توجد عطلات رسمية مضافة.</td>
            </tr>
            <tr v-for="holiday in holidays" :key="holiday.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ holiday.description }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium" dir="ltr" style="text-align: right;">{{ holiday.holiday_date }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                <button @click="deleteHoliday(holiday.holiday_date)" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md transition-colors border border-red-100">حذف</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Holiday Modal -->
    <div v-if="showAddHolidayModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" @click="showAddHolidayModal = false"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-xl px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-100">
          <div>
            <h3 class="text-xl leading-6 font-bold text-gray-900" id="modal-title">إضافة عطلة رسمية</h3>
            <div class="mt-6 space-y-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">اسم العطلة</label>
                <input type="text" v-model="newHoliday.description" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">تاريخ العطلة</label>
                <input type="date" v-model="newHoliday.holiday_date" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-sans" dir="ltr">
              </div>
            </div>
          </div>
          <div class="mt-8 sm:flex sm:flex-row-reverse sm:gap-3">
            <button @click="addHoliday" :disabled="saving" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm disabled:opacity-50">
              {{ saving ? 'جاري الحفظ...' : 'حفظ' }}
            </button>
            <button @click="showAddHolidayModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api/client'

const holidays = ref<any[]>([])
const loading = ref(true)

const showAddHolidayModal = ref(false)
const saving = ref(false)
const newHoliday = ref({ description: '', holiday_date: '' })

const loadData = async () => {
  loading.value = true
  try {
    holidays.value = await apiFetch('/admin/holidays')
  } catch (err) {
    console.error('Failed to load settings', err)
  } finally {
    loading.value = false
  }
}

const addHoliday = async () => {
  if (!newHoliday.value.description || !newHoliday.value.holiday_date) {
    alert('الرجاء إدخال اسم وتاريخ العطلة')
    return
  }
  
  saving.value = true
  try {
    await apiFetch('/admin/holidays', {
      method: 'POST',
      body: JSON.stringify({
        holiday_date: newHoliday.value.holiday_date,
        description: newHoliday.value.description
      })
    })
    showAddHolidayModal.value = false
    newHoliday.value = { description: '', holiday_date: '' }
    await loadData()
  } catch (err: any) {
    alert(err.message || 'حدث خطأ أثناء إضافة العطلة')
  } finally {
    saving.value = false
  }
}

const deleteHoliday = async (id: number) => {
  if (!confirm('هل أنت متأكد أنك تريد حذف هذه العطلة؟')) return
  try {
    await apiFetch(`/admin/holidays/${id}`, { method: 'DELETE' })
    await loadData()
  } catch (err) {
    alert('حدث خطأ أثناء الحذف')
  }
}

onMounted(() => {
  loadData()
})
</script>
