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
        'fixed inset-y-0 right-0 z-30 w-64 bg-gray-900 text-white transition duration-300 transform lg:static lg:inset-0'
      ]"
    >
      <div class="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-800">
        <span class="text-xl font-bold uppercase tracking-wider text-white">إي كلاس HR</span>
      </div>

      <nav class="mt-5 px-2 space-y-1">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.to"
          class="group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors"
          :class="[$route.name === item.routeName ? 'bg-primary-900 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white']"
          @click="closeMobileMenu"
        >
          <component :is="item.icon" class="ml-4 flex-shrink-0 h-6 w-6" :class="[$route.name === item.routeName ? 'text-primary-100' : 'text-gray-400 group-hover:text-gray-300']" aria-hidden="true" />
          {{ item.name }}
        </router-link>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Users, FileText, DollarSign, Settings, BarChart2, Radio } from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const navigation = [
  { name: 'الموظفين', to: '/', routeName: 'employees', icon: Users },
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
