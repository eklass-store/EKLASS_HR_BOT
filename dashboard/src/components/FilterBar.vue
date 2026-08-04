<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  showMonth?: boolean
  showSearch?: boolean
  showStatus?: boolean
  showDepartment?: boolean
  departments?: any[]
  availableMonths?: string[]
}>()

const emit = defineEmits<{
  (e: 'filter', filters: any): void
}>()

const filters = ref({
  month: '',
  search: '',
  status: '',
  departmentId: ''
})

watch(filters, (newVal) => {
  emit('filter', newVal)
}, { deep: true })
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
    
    <!-- Search -->
    <div v-if="showSearch" class="flex-1 min-w-[200px]">
      <label class="block text-xs font-medium text-gray-500 mb-1">بحث</label>
      <input 
        v-model="filters.search" 
        type="text" 
        placeholder="ابحث بالاسم..." 
        class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
      >
    </div>

    <!-- Month -->
    <div v-if="showMonth" class="w-48">
      <label class="block text-xs font-medium text-gray-500 mb-1">الشهر</label>
      <select 
        v-model="filters.month" 
        class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
      >
        <option value="">كل الأشهر</option>
        <option v-for="m in availableMonths" :key="m" :value="m">{{ m }}</option>
      </select>
    </div>

    <!-- Department -->
    <div v-if="showDepartment" class="w-48">
      <label class="block text-xs font-medium text-gray-500 mb-1">القسم</label>
      <select 
        v-model="filters.departmentId" 
        class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
      >
        <option value="">كل الأقسام</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
    </div>

    <!-- Status -->
    <div v-if="showStatus" class="w-48">
      <label class="block text-xs font-medium text-gray-500 mb-1">الحالة</label>
      <select 
        v-model="filters.status" 
        class="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
      >
        <option value="">الكل</option>
        <option value="pending">قيد الانتظار</option>
        <option value="approved">مقبول</option>
        <option value="rejected">مرفوض</option>
      </select>
    </div>

  </div>
</template>
