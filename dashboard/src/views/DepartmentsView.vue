<template>
  <div class="space-y-8">
    <div>
      <h3 class="text-xl font-bold leading-6 text-gray-900">إدارة الأقسام</h3>
      <p class="mt-1 text-sm text-gray-500">إضافة، تعديل وحذف أقسام الشركة.</p>
    </div>

    <!-- Departments Table -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-6 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-bold text-gray-900">الأقسام الحالية</h3>
        <button @click="openAddModal" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
          إضافة قسم جديد
        </button>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-right">
          <thead class="bg-white">
            <tr>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">الرقم</th>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">اسم القسم</th>
              <th scope="col" class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">معرف المدير</th>
              <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-500">جاري التحميل...</td>
            </tr>
            <tr v-else-if="departments.length === 0">
              <td colspan="4" class="px-6 py-10 text-center text-sm text-gray-500">لا توجد أقسام مضافة.</td>
            </tr>
            <tr v-for="dept in departments" :key="dept.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ dept.id }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{{ dept.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{{ dept.manager_id || 'لا يوجد' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2 space-x-reverse">
                <button @click="openEditModal(dept)" class="text-primary-600 hover:text-primary-900 bg-primary-50 px-3 py-1 rounded-md transition-colors border border-primary-100">تعديل</button>
                <button @click="deleteDepartment(dept.id)" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md transition-colors border border-red-100">حذف</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" @click="showModal = false"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-xl px-4 pt-5 pb-4 text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-100">
          <div>
            <h3 class="text-xl leading-6 font-bold text-gray-900" id="modal-title">{{ isEditing ? 'تعديل القسم' : 'إضافة قسم جديد' }}</h3>
            <div class="mt-6 space-y-5">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">اسم القسم <span class="text-red-500">*</span></label>
                <input type="text" v-model="formData.name" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="مثال: التسويق">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">معرف مدير القسم (اختياري)</label>
                <input type="number" v-model="formData.manager_id" class="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" placeholder="أدخل ID الموظف">
              </div>
            </div>
          </div>
          <div class="mt-8 sm:flex sm:flex-row-reverse sm:gap-3">
            <button @click="saveDepartment" :disabled="saving" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm disabled:opacity-50">
              {{ saving ? 'جاري الحفظ...' : 'حفظ' }}
            </button>
            <button @click="showModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm">
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
import { useToast } from '../composables/useToast'

const toast = useToast()

const departments = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const isEditing = ref(false)
const currentId = ref<number | null>(null)

const formData = ref({ name: '', manager_id: '' })

const loadData = async () => {
  loading.value = true
  try {
    departments.value = await apiFetch('/departments')
  } catch (err) {
    console.error('Failed to load departments', err)
    toast.showToast('فشل تحميل الأقسام', 'error')
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  isEditing.value = false
  currentId.value = null
  formData.value = { name: '', manager_id: '' }
  showModal.value = true
}

const openEditModal = (dept: any) => {
  isEditing.value = true
  currentId.value = dept.id
  formData.value = { 
    name: dept.name, 
    manager_id: dept.manager_id ? String(dept.manager_id) : '' 
  }
  showModal.value = true
}

const saveDepartment = async () => {
  if (!formData.value.name) {
    toast.showToast('الرجاء إدخال اسم القسم', 'error')
    return
  }
  
  saving.value = true
  try {
    const payload = {
      name: formData.value.name,
      manager_id: formData.value.manager_id ? Number(formData.value.manager_id) : null
    }

    if (isEditing.value && currentId.value) {
      await apiFetch(`/admin/departments/${currentId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      toast.showToast('تم تعديل القسم بنجاح', 'success')
    } else {
      await apiFetch('/admin/departments', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      toast.showToast('تم إضافة القسم بنجاح', 'success')
    }
    showModal.value = false
    await loadData()
  } catch (err: any) {
    toast.showToast(err.message || 'حدث خطأ أثناء الحفظ. قد يكون الاسم مكرراً.', 'error')
  } finally {
    saving.value = false
  }
}

const deleteDepartment = async (id: number) => {
  if (!confirm('هل أنت متأكد أنك تريد حذف هذا القسم؟')) return
  try {
    await apiFetch(`/admin/departments/${id}`, { method: 'DELETE' })
    toast.showToast('تم حذف القسم بنجاح', 'success')
    await loadData()
  } catch (err: any) {
    toast.showToast(err.message || 'حدث خطأ أثناء الحذف', 'error')
  }
}

onMounted(() => {
  loadData()
})
</script>
