import { ref } from 'vue'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'red' | 'primary' | 'yellow'
}

const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: '',
  message: '',
  confirmText: 'تأكيد',
  cancelText: 'إلغاء',
  confirmColor: 'primary'
})

let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    options.value = {
      confirmText: 'تأكيد',
      cancelText: 'إلغاء',
      confirmColor: 'primary',
      ...opts
    }
    isOpen.value = true
    
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    isOpen.value = false
    if (resolvePromise) resolvePromise(true)
  }

  const handleCancel = () => {
    isOpen.value = false
    if (resolvePromise) resolvePromise(false)
  }

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel
  }
}
