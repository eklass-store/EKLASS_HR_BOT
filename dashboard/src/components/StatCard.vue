<script setup lang="ts">
import { type Component } from 'vue'

defineProps<{
  title: string
  value: string | number
  icon: Component
  trend?: string
  trendUp?: boolean
  colorClass?: string
}>()
</script>

<template>
  <div class="bg-white overflow-hidden shadow-lg shadow-indigo-100 rounded-2xl p-5 hover:-translate-y-1 transition-transform duration-300">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <div :class="['rounded-full p-3 bg-gradient-to-br from-indigo-50 to-white shadow-inner', colorClass || 'text-primary-600']">
          <component :is="icon" class="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
      <div class="ml-5 mr-5 w-0 flex-1">
        <dl>
          <dt class="text-sm font-medium text-gray-500 truncate">{{ title }}</dt>
          <dd>
            <div class="text-2xl font-bold text-gray-900">{{ value }}</div>
          </dd>
        </dl>
      </div>
    </div>
    <div v-if="trend" class="mt-4">
      <div class="flex items-center text-sm">
        <span :class="trendUp ? 'text-emerald-600' : 'text-rose-600'" class="font-medium flex items-center">
          <svg v-if="trendUp" class="w-4 h-4 mr-1 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          <svg v-else class="w-4 h-4 mr-1 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
          {{ trend }}
        </span>
      </div>
    </div>
  </div>
</template>
