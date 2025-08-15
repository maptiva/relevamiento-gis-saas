import { createRouter, createWebHistory } from 'vue-router'
import Auth from '../views/Auth.vue'
import Dashboard from '../views/Dashboard.vue'
import MapView from '../views/MapView.vue'
import { user } from '../composables/getUser'

const routes = [
  {
    path: '/',
    name: 'Auth',
    component: Auth
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/project/:id',
    name: 'MapView',
    component: MapView,
    props: true,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory('/relevamiento-gis-saas/'),
  routes
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !user.value) {
    next({ name: 'Auth' })
  } else if (to.name === 'Auth' && user.value) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
