<template>
  <div>
    <!-- Mobile background overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden"
      @click="$emit('close')"
    ></div>

    <!-- Sidebar -->
    <div
      :class="[
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        'fixed inset-y-0 right-0 z-30 w-64 bg-white border-l border-gray-100 shadow-xl shadow-indigo-100/50 transition duration-300 transform lg:static lg:inset-0 flex flex-col'
      ]"
    >
      <div class="flex items-center justify-center h-20 border-b border-gray-100 bg-gradient-to-br from-indigo-50 to-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-primary-200">
            <span class="text-white font-bold text-xl">EK</span>
          </div>
          <span class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-indigo-900 tracking-wider">إي كلاس HR</span>
        </div>
      </div>

      <nav class="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.to"
          class="group flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200"
          :class="[$route.name === item.routeName 
            ? 'bg-primary-600 text-white shadow-md shadow-primary-200 translate-x-1' 
            : 'text-gray-500 hover:bg-indigo-50 hover:text-primary-700']"
          @click="closeMobileMenu"
        >
          <component 
            :is="item.icon" 
            class="ml-4 flex-shrink-0 h-5 w-5 transition-colors duration-200" 
            :class="[$route.name === item.routeName ? 'text-white' : 'text-gray-400 group-hover:text-primary-600']" 
            aria-hidden="true" 
          />
          {{ item.name }}
        </router-link>
      </nav>
      
      <!-- Footer Info -->
      <div class="p-4 border-t border-gray-100 bg-gray-50/50">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span class="text-primary-700 font-bold text-xs">M</span>
          </div>
          <div class="flex-col flex">
            <span class="text-xs font-bold text-gray-700">مدير النظام</span>
            <span class="text-[10px] text-gray-400">الإدارة</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LayoutDashboard, Users, FileText, DollarSign, Settings, BarChart2, Radio } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const navigation = [
  { name: 'نظرة عامة', to: '/', routeName: 'home', icon: LayoutDashboard },
  { name: 'الموظفين', to: '/employees', routeName: 'employees', icon: Users },
  { name: 'الطلبات', to: '/requests', routeName: 'requests', icon: FileText },
  { name: 'الحضور والرواتب', to: '/payroll', routeName: 'payroll', icon: DollarSign },
  { name: 'التقارير', to: '/reports', routeName: 'reports', icon: BarChart2 },
  { name: 'الإذاعة', to: '/broadcast', routeName: 'broadcast', icon: Radio },
  { name: 'الإعدادات', to: '/settings', routeName: 'settings', icon: Settings },
]

const closeMobileMenu = () => {
  if (window.innerWidth < 1024) {
    emit('close')
  }
}
</script>
