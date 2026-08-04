<template>
  <header class="bg-white shadow-sm z-10 sticky top-0">
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <button
            @click="$emit('openSidebar')"
            class="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
          >
            <span class="sr-only">Open sidebar</span>
            <MenuIcon class="h-6 w-6" aria-hidden="true" />
          </button>
          
          <h1 class="mr-4 text-xl font-semibold text-gray-900 hidden lg:block">{{ currentRouteName }}</h1>
        </div>
        
        <div class="flex items-center gap-4">
          <span class="text-sm font-medium text-gray-700">{{ user?.first_name }} {{ user?.last_name || '' }}</span>
          <button @click="logout" class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors focus:outline-none" title="تسجيل الخروج">
            <LogOut class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { LogOut, Menu as MenuIcon } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'openSidebar'): void
}>()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

const routeNames: Record<string, string> = {
  'employees': 'إدارة الموظفين',
  'requests': 'الطلبات والإجازات',
  'payroll': 'الحضور والرواتب',
  'reports': 'التقارير والإحصائيات',
  'broadcast': 'الإذاعة',
  'settings': 'الإعدادات'
}

const currentRouteName = computed(() => routeNames[route.name as string] || '')

import { useConfirm } from '../composables/useConfirm'
const { confirm } = useConfirm()

const logout = async () => {
  const isConfirmed = await confirm({
    title: 'تسجيل الخروج',
    message: 'هل أنت متأكد أنك تريد تسجيل الخروج من النظام؟',
    confirmText: 'تسجيل الخروج',
    confirmColor: 'red'
  })
  if (isConfirmed) {
    authStore.logout()
    router.push('/login')
  }
}
</script>
