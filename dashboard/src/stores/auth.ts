import { defineStore } from 'pinia'

interface User {
  id: string
  first_name: string
  last_name?: string
  username?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: sessionStorage.getItem('token') || null,
    user: (function() {
      try {
        const val = sessionStorage.getItem('user');
        return val ? JSON.parse(val) : null;
      } catch (e) {
        return null;
      }
    })() as User | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    setAuth(token: string, user: User) {
      this.token = token
      this.user = user
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))
    },
    logout() {
      this.token = null
      this.user = null
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
    }
  }
})
