<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="inline-block align-bottom bg-white rounded-2xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900" id="modal-title">إرسال رسالة مباشرة</h3>
            <p class="text-sm text-gray-500 mt-1">ستصل هذه الرسالة فوراً للموظف {{ employeeName }} عبر تيليجرام.</p>
          </div>
        </div>
        
        <div>
          <textarea 
            v-model="message" 
            rows="5"
            placeholder="اكتب رسالتك هنا..."
            class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-3 border resize-none transition-colors"
          ></textarea>
        </div>
        
        <div class="mt-8 flex gap-3 flex-row-reverse">
          <button 
            @click="handleSend"
            :disabled="sending || !message.trim()"
            class="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-md shadow-primary-200 px-4 py-2 bg-primary-600 text-base font-bold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors"
          >
            <svg v-if="sending" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span v-else class="ml-2">إرسال الرسالة</span>
            <svg v-if="!sending" class="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
          <button 
            @click="$emit('close')"
            class="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { apiFetch } from '../api/client'
import { useToast } from '../composables/useToast'

const props = defineProps<{
  isOpen: boolean
  employeeId: number | null
  employeeName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'sent'): void
}>()

const { showToast } = useToast()
const message = ref('')
const sending = ref(false)

const handleSend = async () => {
  if (!props.employeeId || !message.value.trim()) return
  
  sending.value = true
  try {
    await apiFetch(`/admin/employees/${props.employeeId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message: message.value.trim() })
    })
    showToast('تم إرسال الرسالة بنجاح', 'success')
    message.value = ''
    emit('sent')
    emit('close')
  } catch (error: any) {
    showToast(error.message || 'فشل في إرسال الرسالة', 'error')
  } finally {
    sending.value = false
  }
}
</script>
