<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h3 class="text-xl font-bold leading-6 text-gray-900">نظام الإذاعة</h3>
      <p class="mt-1 text-sm text-gray-500">إرسال إعلانات ورسائل جماعية لجميع الموظفين المسجلين عبر تيليجرام.</p>
    </div>

    <div class="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
      <div v-if="successMsg" class="mb-5 p-4 rounded-lg bg-green-50 text-green-800 text-sm border border-green-100 font-medium">
        {{ successMsg }}
      </div>
      <div v-if="errorMsg" class="mb-5 p-4 rounded-lg bg-red-50 text-red-800 text-sm border border-red-100 font-medium">
        {{ errorMsg }}
      </div>

      <div class="space-y-5">
        <div>
          <label for="message" class="block text-sm font-semibold text-gray-700 mb-2">محتوى الرسالة</label>
          <div class="mt-1">
            <textarea id="message" v-model="message" rows="6" class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-4 border" placeholder="اكتب إعلانك هنا... (يدعم تنسيق Markdown)"></textarea>
          </div>
          <p class="mt-2 text-xs text-gray-500">تأكد من مراجعة الرسالة قبل الإرسال، حيث سيتم إرسالها لجميع الموظفين النشطين فوراً.</p>
        </div>

        <div class="flex justify-end pt-2">
          <button @click="sendBroadcast" :disabled="loading || !message.trim()" class="inline-flex items-center px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors">
            <span v-if="loading">جاري الإرسال...</span>
            <span v-else>إرسال الإذاعة الآن</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { apiFetch } from '../api/client'

const message = ref('')
const loading = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

const sendBroadcast = async () => {
  if (!message.value.trim()) return
  if (!confirm('هل أنت متأكد أنك تريد إرسال هذه الرسالة لجميع الموظفين؟')) return

  loading.value = true
  successMsg.value = ''
  errorMsg.value = ''

  try {
    const res = await apiFetch('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message: message.value })
    })
    successMsg.value = `تم إرسال الإذاعة بنجاح إلى ${res.sentCount} موظف/موظفة.`
    message.value = ''
  } catch (err: any) {
    errorMsg.value = err.message || 'فشل في إرسال الإذاعة'
  } finally {
    loading.value = false
  }
}
</script>
