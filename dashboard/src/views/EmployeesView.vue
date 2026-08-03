<template>
  <div class="space-y-6 relative">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-xl font-bold leading-6 text-gray-900">إدارة الموظفين</h3>
        <p class="mt-1 text-sm text-gray-500">إدارة جميع الموظفين المسجلين في النظام، مع إمكانية البحث الذكي.</p>
      </div>
      <div class="mt-4 sm:mt-0 flex gap-3">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="ابحث بالاسم أو المعرف..." 
          class="block w-full sm:w-64 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-4 py-2 border"
        />
        <button @click="showAddModal = true" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap">
          إضافة موظف
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-5 flex items-center">
        <div class="p-3 rounded-full bg-primary-50 text-primary-600 mr-4 ml-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500 truncate">إجمالي الموظفين</dt>
          <dd class="mt-1 text-3xl font-semibold text-gray-900">{{ stats.employees || 0 }}</dd>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الاسم والمعرف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">المنصب والقسم</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الراتب الأساسي</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
              <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="filteredEmployees.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">
                لا يوجد موظفين مطابقين للبحث.
              </td>
            </tr>
            <tr v-for="emp in filteredEmployees" :key="emp.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">{{ emp.full_name }}</div>
                <div class="text-sm text-gray-500 mt-1">TG ID: {{ emp.telegram_id }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium capitalize" :class="emp.role === 'admin' ? 'text-primary-600' : 'text-gray-900'">{{ emp.role === 'admin' ? 'مشرف' : 'موظف' }}</div>
                <div class="text-sm text-gray-500 mt-1">{{ emp.department || 'غير محدد' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                {{ emp.base_salary.toLocaleString() }} ج.م
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="emp.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'">
                  {{ emp.is_active ? 'نشط' : 'غير نشط' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-3 space-x-reverse">
                <button @click="openEditModal(emp)" class="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md transition-colors">تعديل</button>
                <button v-if="emp.is_active" @click="toggleActive(emp.id, false)" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md transition-colors">إيقاف</button>
                <button v-else @click="toggleActive(emp.id, true)" class="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md transition-colors">تفعيل</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingEmp" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" @click="closeModal"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-xl px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-100">
          <div>
            <h3 class="text-xl leading-6 font-bold text-gray-900" id="modal-title">
              {{ editingEmp ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد' }}
            </h3>
            <div class="mt-6 space-y-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">معرف تيليجرام (TG ID)</label>
                <input type="text" v-model="form.telegram_id" :disabled="!!editingEmp" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">الاسم الكامل</label>
                <input type="text" v-model="form.full_name" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1">الصلاحية</label>
                  <select v-model="form.role" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                    <option value="employee">موظف</option>
                    <option value="admin">مشرف</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-1">القسم</label>
                  <input type="text" v-model="form.department" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                </div>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">الراتب الأساسي (ج.م)</label>
                <input type="number" v-model="form.base_salary" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
            </div>
          </div>
          <div class="mt-8 sm:flex sm:flex-row-reverse sm:gap-3">
            <button @click="saveEmployee" :disabled="saving" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm disabled:opacity-50">
              {{ saving ? 'جاري الحفظ...' : 'حفظ البيانات' }}
            </button>
            <button @click="closeModal" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch } from '../api/client'
import { normalizeArabicText } from '../utils/helpers'

const employees = ref<any[]>([])
const stats = ref<any>({ employees: 0 })
const loading = ref(true)
const searchQuery = ref('')

const filteredEmployees = computed(() => {
  if (!searchQuery.value) return employees.value
  const query = normalizeArabicText(searchQuery.value)
  return employees.value.filter(emp => {
    return normalizeArabicText(emp.full_name).includes(query) ||
           String(emp.telegram_id).includes(query)
  })
})

const showAddModal = ref(false)
const editingEmp = ref<any>(null)
const saving = ref(false)
const form = ref({
  telegram_id: '',
  full_name: '',
  role: 'employee',
  department: '',
  base_salary: 0
})

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

const openEditModal = (emp: any) => {
  editingEmp.value = emp
  form.value = {
    telegram_id: emp.telegram_id,
    full_name: emp.full_name,
    role: emp.role,
    department: emp.department,
    base_salary: emp.base_salary
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingEmp.value = null
  form.value = { telegram_id: '', full_name: '', role: 'employee', department: '', base_salary: 0 }
}

const saveEmployee = async () => {
  if (!form.value.telegram_id || !form.value.full_name) {
    alert('معرف تيليجرام والاسم مطلوبان')
    return
  }

  saving.value = true
  try {
    if (editingEmp.value) {
      await apiFetch(`/admin/employees/${editingEmp.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(form.value)
      })
    } else {
      await apiFetch('/admin/employees', {
        method: 'POST',
        body: JSON.stringify(form.value)
      })
    }
    closeModal()
    await loadData()
  } catch (err: any) {
    alert(err.message || 'خطأ أثناء الحفظ')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (id: number, isActive: boolean) => {
  if (!confirm(`هل أنت متأكد أنك تريد ${isActive ? 'تفعيل' : 'إيقاف'} هذا الموظف؟`)) return
  try {
    if (!isActive) {
      await apiFetch(`/admin/employees/${id}`, { method: 'DELETE' })
    } else {
      await apiFetch(`/admin/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: true })
      })
    }
    await loadData()
  } catch (err) {
    alert('خطأ أثناء تغيير الحالة')
  }
}

onMounted(() => {
  loadData()
})
</script>
