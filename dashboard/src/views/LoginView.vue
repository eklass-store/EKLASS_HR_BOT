<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
      <div class="text-center">
        <h2 class="mt-2 text-3xl font-bold text-gray-900 tracking-tight">Challengawy HR</h2>
        <p class="mt-2 text-sm text-gray-500">بوابة دخول المشرفين</p>
      </div>
      
      <div v-if="error" class="bg-red-50 text-red-600 p-4 rounded-lg text-sm text-center border border-red-100 font-medium">
        {{ error }}
      </div>

      <div class="mt-8 flex justify-center">
        <!-- Telegram Login Widget -->
        <div ref="telegramWidget" class="transform scale-110"></div>
      </div>
      
      <div class="mt-6 text-center text-xs text-gray-400">
        الرجاء تسجيل الدخول باستخدام حساب تيليجرام الخاص بك والمصرح له بالوصول.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')
const telegramWidget = ref<HTMLElement | null>(null)

onMounted(() => {
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'challengawy_hr_bot' 
  
  ;(window as any).onTelegramAuth = async (user: any) => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '/api') + '/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      })
      
      let data: any = {}
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch(e) {
        data = { error: 'استجابة غير صالحة من الخادم' }
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'فشل المصادقة: ' + res.status)
      }
      
      authStore.setAuth(data.token, data.user)
      router.push('/')
      
    } catch (err: any) {
      error.value = err.message
    }
  }

  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', botUsername)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.setAttribute('data-request-access', 'write')
  
  if (telegramWidget.value) {
    telegramWidget.value.appendChild(script)
  }
})
</script>
