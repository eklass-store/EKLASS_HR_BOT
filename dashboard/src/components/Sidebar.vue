<template>
  <div>
    <!-- Mobile background overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-20 bg-gray-900/40 backdrop-blur-sm transition-opacity lg:hidden"
      @click="$emit('close')"
    ></div>

    <!-- Sidebar -->
    <div
      :class="[
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        isCollapsed ? 'w-20' : 'w-64',
        'fixed inset-y-0 right-0 z-30 bg-white border-l border-gray-100 transition-all duration-300 transform lg:static flex flex-col shadow-sm'
      ]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between h-20 px-4 border-b border-gray-100">
        <div class="flex items-center gap-3 overflow-hidden" :class="isCollapsed ? 'justify-center w-full' : ''">
          <div class="w-10 h-10 flex-shrink-0 rounded-xl bg-primary-50 flex items-center justify-center">
            <span class="text-primary-600 font-bold text-xl">EK</span>
          </div>
          <span v-if="!isCollapsed" class="text-lg font-black text-gray-900 tracking-wider whitespace-nowrap">إي كلاس HR</span>
        </div>
        
        <button 
          v-if="!isCollapsed"
          @click="toggleCollapse" 
          class="hidden lg:flex text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 mt-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <button 
          v-if="isCollapsed"
          @click="toggleCollapse" 
          class="w-full hidden lg:flex justify-center mb-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          title="توسيع القائمة"
        >
          <Menu class="w-5 h-5" />
        </button>

        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.to"
          class="group flex items-center px-3 py-3 text-sm font-bold rounded-xl transition-all duration-200"
          :class="[
            $route.name === item.routeName 
              ? 'bg-primary-50 text-primary-700' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
            isCollapsed ? 'justify-center' : ''
          ]"
          :title="isCollapsed ? item.name : ''"
          @click="closeMobileMenu"
        >
          <component 
            :is="item.icon" 
            class="flex-shrink-0 w-5 h-5 transition-colors duration-200"
            :class="[
              $route.name === item.routeName ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600',
              isCollapsed ? '' : 'ml-3'
            ]" 
            aria-hidden="true" 
          />
          <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
        </router-link>
      </nav>
      
      <!-- Footer Info -->
      <div class="p-4 border-t border-gray-100" :class="isCollapsed ? 'flex justify-center' : ''">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
            <span class="text-gray-600 font-bold text-sm">M</span>
          </div>
          <div v-if="!isCollapsed" class="flex-col flex overflow-hidden">
            <span class="text-sm font-bold text-gray-900 truncate">مدير النظام</span>
            <span class="text-xs text-gray-500 truncate">الإدارة</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LayoutDashboard, Users, FileText, DollarSign, Settings, BarChart2, Radio, ChevronRight, Menu, Clock, Building2, ClipboardList } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const navigation = [
  { name: 'نظرة عامة', to: '/', routeName: 'home', icon: LayoutDashboard },
  { name: 'الموظفين', to: '/employees', routeName: 'employees', icon: Users },
  { name: 'الطلبات', to: '/requests', routeName: 'requests', icon: FileText },
  { name: 'الرواتب', to: '/payroll', routeName: 'payroll', icon: DollarSign },
  { name: 'الحضور اليومي', to: '/attendance-daily', routeName: 'attendance-daily', icon: Clock },
  { name: 'الأقسام', to: '/departments', routeName: 'departments', icon: Building2 },
  { name: 'التقارير', to: '/reports', routeName: 'reports', icon: BarChart2 },
  { name: 'سجل التدقيق', to: '/audit-logs', routeName: 'audit-logs', icon: ClipboardList },
  { name: 'الإذاعة', to: '/broadcast', routeName: 'broadcast', icon: Radio },
  { name: 'الإعدادات', to: '/settings', routeName: 'settings', icon: Settings },
]

const closeMobileMenu = () => {
  if (window.innerWidth < 1024) {
    emit('close')
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>
