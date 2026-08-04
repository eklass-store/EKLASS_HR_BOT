<template>
  <div class="space-y-6 relative">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-xl font-bold leading-6 text-gray-900">إدارة الموظفين</h3>
        <p class="mt-1 text-sm text-gray-500">إدارة جميع الموظفين المسجلين في النظام وعرض ملفاتهم الشخصية.</p>
      </div>
      <div class="mt-4 sm:mt-0 flex gap-3">
        <button @click="showAddModal = true" class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-md shadow-primary-200 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors whitespace-nowrap">
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          إضافة موظف
        </button>
      </div>
    </div>

    <FilterBar 
      :showSearch="true" 
      :showDepartment="true" 
      :departments="departments"
      @filter="handleFilter" 
    />

    <!-- Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-100">
          <thead class="bg-gray-50/50">
            <tr>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الاسم والمعرف</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">المنصب والقسم</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الراتب الأساسي</th>
              <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
              <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-50">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="filteredEmployees.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center justify-center">
                  <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                  لا يوجد موظفين مطابقين لخيارات الفلترة.
                </div>
              </td>
            </tr>
            <tr v-for="emp in filteredEmployees" :key="emp.id" class="hover:bg-indigo-50/30 transition-colors group">
              <td class="px-6 py-4 whitespace-nowrap">
                <router-link :to="`/employees/${emp.id}`" class="block">
                  <div class="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{{ emp.full_name }}</div>
                  <div class="text-xs text-gray-400 mt-1" dir="ltr">{{ emp.telegram_id }}</div>
                </router-link>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold" :class="emp.role === 'admin' ? 'text-primary-600' : 'text-gray-700'">{{ emp.role === 'admin' ? 'مشرف' : 'موظف' }}</div>
                <div class="text-xs font-medium text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">{{ emp.department_name || 'بدون قسم' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                {{ emp.base_salary.toLocaleString() }} ج.م
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                  :class="emp.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'">
                  {{ emp.is_active ? 'نشط' : 'غير نشط' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2 space-x-reverse">
                <button @click="openEditModal(emp)" class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">تعديل</button>
                <button v-if="emp.is_active" @click="toggleActive(emp.id, false)" class="text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">إيقاف</button>
                <button v-else @click="toggleActive(emp.id, true)" class="text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">تفعيل</button>
                <router-link :to="`/employees/${emp.id}`" class="inline-block text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">الملف</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingEmp" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="closeModal"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-100">
          <div>
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
              <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 class="text-xl leading-6 font-bold text-gray-900 text-center" id="modal-title">
              {{ editingEmp ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد' }}
            </h3>
            <div class="mt-6 space-y-4">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">معرف تيليجرام (TG ID)</label>
                <input type="text" v-model="form.telegram_id" :disabled="!!editingEmp" class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 transition-colors">
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل</label>
                <input type="text" v-model="form.full_name" class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-bold text-gray-700 mb-1">الصلاحية</label>
                  <select v-model="form.role" class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors">
                    <option value="employee">موظف</option>
                    <option value="admin">مشرف</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-bold text-gray-700 mb-1">القسم</label>
                  <select v-model="form.department_id" class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors">
                    <option value="">بدون قسم</option>
                    <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1">الراتب الأساسي (ج.م)</label>
                <input type="number" v-model="form.base_salary" class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors">
              </div>
            </div>
          </div>
          <div class="mt-8 sm:flex sm:flex-row-reverse sm:gap-3">
            <button @click="saveEmployee" :disabled="saving" class="w-full inline-flex justify-center rounded-lg border border-transparent shadow-md shadow-primary-200 px-4 py-2 bg-primary-600 text-base font-bold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors">
              {{ saving ? 'جاري الحفظ...' : 'حفظ البيانات' }}
            </button>
            <button @click="closeModal" class="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors">
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
import FilterBar from '../components/FilterBar.vue'

const employees = ref<any[]>([])
const departments = ref<any[]>([])
const loading = ref(true)

const filters = ref({ search: '', departmentId: '' })

const handleFilter = (f: any) => {
  filters.value = f
}

const filteredEmployees = computed(() => {
  let result = employees.value
  
  if (filters.value.departmentId) {
    result = result.filter(e => e.department_id === filters.value.departmentId)
  }

  if (filters.value.search) {
    const query = normalizeArabicText(filters.value.search)
    result = result.filter(emp => 
      normalizeArabicText(emp.full_name).includes(query) ||
      String(emp.telegram_id).includes(query)
    )
  }

  return result
})

const showAddModal = ref(false)
const editingEmp = ref<any>(null)
const saving = ref(false)
const form = ref({
  telegram_id: '',
  full_name: '',
  role: 'employee',
  department_id: '',
  base_salary: 0
})

const loadData = async () => {
  try {
    loading.value = true
    const [empData, deptData] = await Promise.all([
      apiFetch('/employees'),
      apiFetch('/departments')
    ])
    employees.value = empData
    departments.value = deptData
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
    department_id: emp.department_id || '',
    base_salary: emp.base_salary
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingEmp.value = null
  form.value = { telegram_id: '', full_name: '', role: 'employee', department_id: '', base_salary: 0 }
}

const saveEmployee = async () => {
  if (!form.value.telegram_id || !form.value.full_name) {
    alert('معرف تيليجرام والاسم مطلوبان')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      department_id: form.value.department_id ? Number(form.value.department_id) : null
    }

    if (editingEmp.value) {
      await apiFetch(`/admin/employees/${editingEmp.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
    } else {
      await apiFetch('/admin/employees', {
        method: 'POST',
        body: JSON.stringify(payload)
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
