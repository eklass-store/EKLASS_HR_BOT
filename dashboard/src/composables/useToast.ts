import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

const toasts = ref<ToastMessage[]>([])
let nextId = 0

export function useToast() {
  const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = nextId++
    toasts.value.push({ id, message, type })
    
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return {
    toasts,
    showToast,
    removeToast
  }
}
