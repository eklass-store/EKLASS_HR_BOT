<template>
  <div class="space-y-8">
    <div>
      <h3 class="text-lg font-medium leading-6 text-gray-900">Requests Management</h3>
      <p class="mt-1 text-sm text-gray-500">Approve or reject leaves and loans.</p>
    </div>

    <!-- Leaves -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
      <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">Leave Requests</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type & Reason</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
            </tr>
            <tr v-else-if="leaves.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">No leaves found.</td>
            </tr>
            <tr v-for="leave in leaves" :key="leave.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ leave.full_name }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">
                <span class="font-medium text-gray-900">{{ leave.type }}</span><br/>
                {{ leave.reason || 'No reason provided' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ leave.start_date }} to {{ leave.end_date }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-800': leave.status === 'pending',
                    'bg-green-100 text-green-800': leave.status === 'approved',
                    'bg-red-100 text-red-800': leave.status === 'rejected'
                  }">
                  {{ leave.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div v-if="leave.status === 'pending'" class="space-x-2">
                  <button @click="updateLeaveStatus(leave.id, 'approved')" class="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md">Approve</button>
                  <button @click="updateLeaveStatus(leave.id, 'rejected')" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md">Reject</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loans -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
      <div class="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">Loan Requests</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
            </tr>
            <tr v-else-if="loans.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">No loans found.</td>
            </tr>
            <tr v-for="loan in loans" :key="loan.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ loan.full_name }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ loan.amount.toLocaleString() }} EGP</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ loan.reason || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-800': loan.status === 'pending',
                    'bg-green-100 text-green-800': loan.status === 'approved',
                    'bg-red-100 text-red-800': loan.status === 'rejected'
                  }">
                  {{ loan.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div v-if="loan.status === 'pending'" class="space-x-2">
                  <button @click="updateLoanStatus(loan.id, 'approved')" class="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md">Approve</button>
                  <button @click="updateLoanStatus(loan.id, 'rejected')" class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded-md">Reject</button>
                </div>
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

const leaves = ref<any[]>([])
const loans = ref<any[]>([])
const loading = ref(true)

const loadData = async () => {
  loading.value = true
  try {
    const [leavesData, loansData] = await Promise.all([
      apiFetch('/admin/leaves'),
      apiFetch('/admin/loans')
    ])
    leaves.value = leavesData
    loans.value = loansData
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const updateLeaveStatus = async (id: number, status: string) => {
  if (!confirm(`Are you sure you want to ${status} this leave?`)) return
  try {
    await apiFetch(`/admin/leaves/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
    await loadData()
  } catch (err) {
    alert('Error updating leave status')
  }
}

const updateLoanStatus = async (id: number, status: string) => {
  if (!confirm(`Are you sure you want to ${status} this loan?`)) return
  try {
    await apiFetch(`/admin/loans/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
    await loadData()
  } catch (err) {
    alert('Error updating loan status')
  }
}

onMounted(() => {
  loadData()
})
</script>
