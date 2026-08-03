<template>
  <div class="space-y-6">
    <div class="sm:flex sm:items-center sm:justify-between mb-8">
      <div>
        <h3 class="text-xl font-bold leading-6 text-gray-900">التقارير والإحصائيات الشاملة</h3>
        <p class="mt-1 text-sm text-gray-500">تحليل تفصيلي للإجازات، السلف، وحالة الموظفين.</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <select v-model="selectedMonth" @change="processData" class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm px-4 py-2 border font-medium">
          <option value="all">كل الأوقات</option>
          <option value="2023-09">سبتمبر 2023</option>
          <option value="2023-10">أكتوبر 2023</option>
          <option value="2023-11">نوفمبر 2023</option>
          <option value="2023-12">ديسمبر 2023</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="h-32 bg-gray-200 rounded-xl"></div>
        <div class="h-32 bg-gray-200 rounded-xl"></div>
        <div class="h-32 bg-gray-200 rounded-xl"></div>
      </div>
      <div class="h-96 bg-gray-200 rounded-xl"></div>
    </div>
    
    <template v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center">
          <div class="p-4 rounded-full bg-blue-50 text-blue-600 ml-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">إجمالي الموظفين النشطين</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ activeEmployees }}</p>
          </div>
        </div>
        
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center">
          <div class="p-4 rounded-full bg-green-50 text-green-600 ml-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">الإجازات المقبولة</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ approvedLeaves }}</p>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center">
          <div class="p-4 rounded-full bg-yellow-50 text-yellow-600 ml-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">إجمالي السلف الممنوحة</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ totalLoansAmount.toLocaleString() }} ج.م</p>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Leaves Chart -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 class="text-base font-bold text-gray-900 mb-6">توزيع أنواع الإجازات المقبولة</h4>
          <div class="h-64 flex justify-center">
            <Pie v-if="leavesChartData" :data="leavesChartData" :options="pieOptions" />
          </div>
        </div>

        <!-- Loans vs Leaves Status Chart -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 class="text-base font-bold text-gray-900 mb-6">حالة الطلبات (إجازات وسلف)</h4>
          <div class="h-64">
            <Bar v-if="statusChartData" :data="statusChartData" :options="barOptions" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '../api/client'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const loading = ref(true)
const selectedMonth = ref('all')

const allLeaves = ref<any[]>([])
const allLoans = ref<any[]>([])
const employees = ref<any[]>([])

const activeEmployees = ref(0)
const approvedLeaves = ref(0)
const totalLoansAmount = ref(0)

const leavesChartData = ref<any>(null)
const statusChartData = ref<any>(null)

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { font: { family: 'Cairo' } }
    },
    tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
  }
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, ticks: { font: { family: 'Cairo' } } },
    x: { ticks: { font: { family: 'Cairo' } } }
  },
  plugins: {
    legend: { labels: { font: { family: 'Cairo' } } },
    tooltip: { titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } }
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [leavesRes, loansRes, empRes] = await Promise.all([
      apiFetch('/admin/leaves'),
      apiFetch('/admin/loans'),
      apiFetch('/employees')
    ])
    allLeaves.value = leavesRes
    allLoans.value = loansRes
    employees.value = empRes
    
    processData()
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const processData = () => {
  activeEmployees.value = employees.value.filter(e => e.is_active).length

  let filteredLeaves = allLeaves.value
  let filteredLoans = allLoans.value

  if (selectedMonth.value !== 'all') {
    filteredLeaves = allLeaves.value.filter(l => l.start_date.startsWith(selectedMonth.value))
    filteredLoans = allLoans.value.filter(l => l.created_at?.startsWith(selectedMonth.value) || true) // Simplified
  }

  // Calculate stats
  const approvedLeavesList = filteredLeaves.filter(l => l.status === 'approved')
  approvedLeaves.value = approvedLeavesList.length
  
  totalLoansAmount.value = filteredLoans
    .filter(l => l.status === 'approved')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0)

  // Leaves Pie Chart
  const leavesByType = approvedLeavesList.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const typeLabels = { 'annual': 'سنوية', 'sick': 'مرضية', 'unpaid': 'بدون راتب' }
  
  leavesChartData.value = {
    labels: Object.keys(leavesByType).map(k => typeLabels[k as keyof typeof typeLabels] || k),
    datasets: [{
      backgroundColor: ['#14b8a6', '#f59e0b', '#f43f5e'],
      data: Object.values(leavesByType)
    }]
  }

  // Status Bar Chart
  const leaveStatuses = { pending: 0, approved: 0, rejected: 0 }
  filteredLeaves.forEach(l => { if (leaveStatuses[l.status as keyof typeof leaveStatuses] !== undefined) leaveStatuses[l.status as keyof typeof leaveStatuses]++ })
  
  const loanStatuses = { pending: 0, approved: 0, rejected: 0 }
  filteredLoans.forEach(l => { if (loanStatuses[l.status as keyof typeof loanStatuses] !== undefined) loanStatuses[l.status as keyof typeof loanStatuses]++ })

  statusChartData.value = {
    labels: ['قيد الانتظار', 'مقبولة', 'مرفوضة'],
    datasets: [
      {
        label: 'طلبات الإجازات',
        backgroundColor: '#0ea5e9',
        data: [leaveStatuses.pending, leaveStatuses.approved, leaveStatuses.rejected]
      },
      {
        label: 'طلبات السلف',
        backgroundColor: '#8b5cf6',
        data: [loanStatuses.pending, loanStatuses.approved, loanStatuses.rejected]
      }
    ]
  }
}

onMounted(() => {
  loadData()
})
</script>
