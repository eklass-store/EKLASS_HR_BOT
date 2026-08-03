<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">EKLASS HR</h2>
        <p class="mt-2 text-center text-sm text-gray-600">Admin Portal Login</p>
      </div>
      
      <div v-if="error" class="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
        {{ error }}
      </div>

      <div class="mt-8 flex justify-center">
        <!-- Telegram Login Widget -->
        <div ref="telegramWidget"></div>
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
  // EKLASS BOT USERNAME
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'eklass_hr_bot' 
  
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
        data = { error: 'Invalid response from server' }
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed: ' + res.status)
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
