<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusConfig = computed(() => {
  switch (props.status.toLowerCase()) {
    case 'approved':
    case 'paid':
    case 'issued':
      return { text: props.status === 'issued' ? 'مُصدر' : props.status === 'paid' ? 'مدفوع' : 'مقبول', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    case 'rejected':
      return { text: 'مرفوض', class: 'bg-rose-100 text-rose-800 border-rose-200' }
    case 'pending':
    default:
      return { text: 'قيد الانتظار', class: 'bg-amber-100 text-amber-800 border-amber-200' }
  }
})
</script>

<template>
  <span :class="[
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
    statusConfig.class
  ]">
    {{ statusConfig.text }}
  </span>
</template>
