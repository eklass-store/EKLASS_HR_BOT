<template>
  <div class="space-y-6 relative">
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900">Employees</h3>
        <p class="mt-1 text-sm text-gray-500">Manage all registered employees in the system.</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <button @click="showAddModal = true" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
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
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name & ID</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role & Dept</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                <div class="text-sm text-gray-500">TG ID: {{ emp.telegram_id }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium capitalize" :class="emp.role === 'admin' ? 'text-purple-600' : 'text-gray-900'">{{ emp.role }}</div>
                <div class="text-sm text-gray-500">{{ emp.department || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {{ emp.base_salary.toLocaleString() }} EGP
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                  {{ emp.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <button @click="openEditModal(emp)" class="text-indigo-600 hover:text-indigo-900">Edit</button>
                <button v-if="emp.is_active" @click="toggleActive(emp.id, false)" class="text-red-600 hover:text-red-900">Deactivate</button>
                <button v-else @click="toggleActive(emp.id, true)" class="text-green-600 hover:text-green-900">Activate</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal (Simple inline overlay for now) -->
    <div v-if="showAddModal || editingEmp" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              {{ editingEmp ? 'Edit Employee' : 'Add New Employee' }}
            </h3>
            <div class="mt-4 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Telegram ID</label>
                <input type="text" v-model="form.telegram_id" :disabled="!!editingEmp" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm disabled:bg-gray-100">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" v-model="form.full_name" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Role</label>
                  <select v-model="form.role" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm">
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Department</label>
                  <input type="text" v-model="form.department" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Base Salary (EGP)</label>
                <input type="number" v-model="form.base_salary" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm">
              </div>
            </div>
          </div>
          <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button @click="saveEmployee" :disabled="saving" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-black text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:col-start-2 sm:text-sm disabled:opacity-50">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button @click="closeModal" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:mt-0 sm:col-start-1 sm:text-sm">
              Cancel
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

const employees = ref<any[]>([])
const stats = ref<any>({ employees: 0 })
const loading = ref(true)

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
    alert('Telegram ID and Name are required')
    return
  }

  saving.value = true
  try {
    if (editingEmp.value) {
      // Update
      await apiFetch(`/admin/employees/${editingEmp.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(form.value)
      })
    } else {
      // Add
      await apiFetch('/admin/employees', {
        method: 'POST',
        body: JSON.stringify(form.value)
      })
    }
    closeModal()
    await loadData()
  } catch (err: any) {
    alert(err.message || 'Error saving employee')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (id: number, isActive: boolean) => {
  if (!confirm(`Are you sure you want to ${isActive ? 'activate' : 'deactivate'} this employee?`)) return
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
    alert('Error changing status')
  }
}

onMounted(() => {
  loadData()
})
</script>
