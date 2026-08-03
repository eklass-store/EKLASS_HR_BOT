import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/',
      component: () => import('../views/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'employees',
          component: () => import('../views/EmployeesView.vue')
        },
        {
          path: 'requests',
          name: 'requests',
          component: () => import('../views/RequestsView.vue')
        },
        {
          path: 'payroll',
          name: 'payroll',
          component: () => import('../views/PayrollView.vue')
        },
        {
          path: 'broadcast',
          name: 'broadcast',
          component: () => import('../views/BroadcastView.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/SettingsView.vue')
        }
      ]
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
