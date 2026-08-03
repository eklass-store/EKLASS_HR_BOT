<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h3 class="text-lg font-medium leading-6 text-gray-900">Send Broadcast</h3>
      <p class="mt-1 text-sm text-gray-500">Send an announcement to all registered employees via Telegram.</p>
    </div>

    <div class="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
      <div v-if="successMsg" class="mb-4 p-4 rounded-md bg-green-50 text-green-800 text-sm">
        {{ successMsg }}
      </div>
      <div v-if="errorMsg" class="mb-4 p-4 rounded-md bg-red-50 text-red-800 text-sm">
        {{ errorMsg }}
      </div>

      <div class="space-y-4">
        <div>
          <label for="message" class="block text-sm font-medium text-gray-700">Message Content</label>
          <div class="mt-1">
            <textarea id="message" v-model="message" rows="5" class="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md p-3 border" placeholder="Type your announcement here... (Markdown is supported)"></textarea>
          </div>
        </div>

        <div class="flex justify-end">
          <button @click="sendBroadcast" :disabled="loading || !message.trim()" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50">
            <span v-if="loading">Sending...</span>
            <span v-else>Send Broadcast</span>
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
  if (!confirm('Are you sure you want to send this message to ALL employees?')) return

  loading.value = true
  successMsg.value = ''
  errorMsg.value = ''

  try {
    const res = await apiFetch('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message: message.value })
    })
    successMsg.value = `Successfully sent broadcast to ${res.sentCount} employees.`
    message.value = ''
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to send broadcast'
  } finally {
    loading.value = false
  }
}
</script>
