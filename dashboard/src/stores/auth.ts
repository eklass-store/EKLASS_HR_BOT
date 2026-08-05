import { defineStore } from 'pinia'

interface User {
  id: string
  first_name: string
  last_name?: string
  username?: string
  hash?: string
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
    async logout() {
      if (this.user?.hash) {
        try {
          await fetch((import.meta.env.VITE_API_URL || '/api') + '/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: this.user.hash })
          });
        } catch (e) {
          console.error('Logout failed:', e);
        }
      }
      this.token = null
      this.user = null
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
    }
  }
})
