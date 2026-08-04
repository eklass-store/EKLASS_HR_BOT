<template>
  <div v-if="isOpen" class="fixed inset-0 z-[110] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="handleCancel"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-gray-100 p-6">
        <div class="sm:flex sm:items-start gap-4">
          <div 
            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 mb-4 sm:mb-0"
            :class="{
              'bg-red-100 text-red-600': options.confirmColor === 'red',
              'bg-primary-100 text-primary-600': options.confirmColor === 'primary',
              'bg-amber-100 text-amber-600': options.confirmColor === 'yellow'
            }"
          >
            <!-- Alert icon -->
            <svg v-if="options.confirmColor === 'red' || options.confirmColor === 'yellow'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <!-- Info icon -->
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="mt-3 text-center sm:mt-0 sm:text-right">
            <h3 class="text-lg leading-6 font-bold text-gray-900" id="modal-title">
              {{ options.title }}
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                {{ options.message }}
              </p>
            </div>
          </div>
        </div>
        <div class="mt-8 sm:flex sm:flex-row-reverse gap-3">
          <button 
            type="button" 
            @click="handleConfirm" 
            class="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm transition-colors"
            :class="{
              'bg-red-600 hover:bg-red-700 focus:ring-red-500': options.confirmColor === 'red',
              'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500': options.confirmColor === 'primary',
              'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white': options.confirmColor === 'yellow'
            }"
          >
            {{ options.confirmText }}
          </button>
          <button 
            type="button" 
            @click="handleCancel" 
            class="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
          >
            {{ options.cancelText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm'

const { isOpen, options, handleConfirm, handleCancel } = useConfirm()
</script>
