<template>
  <div class="h-screen flex overflow-hidden bg-gray-50 font-sans text-gray-900 selection:bg-primary-100 selection:text-primary-900">
    <Sidebar :isOpen="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex flex-col w-0 flex-1 overflow-hidden">
      <Header @openSidebar="sidebarOpen = true" />
      <main class="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50/50">
        <div class="py-8">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <router-view />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import Header from '../components/Header.vue'

const sidebarOpen = ref(false)
</script>
