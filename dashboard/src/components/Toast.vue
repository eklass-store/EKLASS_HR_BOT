<template>
  <div class="fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="pointer-events-auto w-full bg-white shadow-lg rounded-xl pointer-events-auto border-r-4 flex items-center p-4 transition-all duration-300"
        :class="{
          'border-emerald-500': toast.type === 'success',
          'border-rose-500': toast.type === 'error',
          'border-blue-500': toast.type === 'info',
          'border-amber-500': toast.type === 'warning'
        }"
      >
        <div class="flex-shrink-0 ml-3">
          <!-- Success -->
          <svg v-if="toast.type === 'success'" class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <!-- Error -->
          <svg v-else-if="toast.type === 'error'" class="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <!-- Warning -->
          <svg v-else-if="toast.type === 'warning'" class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <!-- Info -->
          <svg v-else class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-gray-800">{{ toast.message }}</p>
        </div>
        <div class="mr-3 flex-shrink-0">
          <button @click="removeToast(toast.id)" class="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
