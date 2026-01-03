import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layout/Index.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('@/views/device/DeviceList.vue'),
        meta: { title: '设备管理' }
      },
      {
        path: 'devices/:id',
        name: 'DeviceDetail',
        component: () => import('@/views/device/DeviceDetail.vue'),
        meta: { title: '设备详情' }
      },
      {
        path: 'devices/:id/config',
        name: 'DeviceConfig',
        component: () => import('@/views/device/DeviceConfig.vue'),
        meta: { title: '设备配置' }
      },
      {
        path: 'devices/:id/status',
        name: 'DeviceStatus',
        component: () => import('@/views/device/DeviceStatus.vue'),
        meta: { title: '设备状态' }
      },
      {
        path: 'devices/test',
        name: 'DeviceTest',
        component: () => import('@/views/device/DeviceTest.vue'),
        meta: { title: '设备端测试' }
      },
      {
        path: 'commands',
        name: 'Commands',
        component: () => import('@/views/command/CommandList.vue'),
        meta: { title: '命令控制' }
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('@/views/alert/AlertList.vue'),
        meta: { title: '告警管理' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/report/ReportList.vue'),
        meta: { title: '报表管理' }
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      },
      {
        path: 'admin/roles',
        name: 'AdminRoles',
        component: () => import('@/views/admin/RoleManagement.vue'),
        meta: { title: '角色管理', requiresAdmin: true }
      },
      {
        path: 'admin/alert-rules',
        name: 'AdminAlertRules',
        component: () => import('@/views/admin/AlertRuleManagement.vue'),
        meta: { title: '告警规则', requiresAdmin: true }
      },
      {
        path: 'admin/report-configs',
        name: 'AdminReportConfigs',
        component: () => import('@/views/admin/ReportConfigManagement.vue'),
        meta: { title: '报表配置', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth !== false) {
    if (!authStore.isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    
    // 检查管理员权限
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next({ name: 'Dashboard' })
      return
    }
  } else {
    // 如果已登录，访问登录页时重定向到首页
    if (authStore.isLoggedIn && to.name === 'Login') {
      next({ name: 'Dashboard' })
      return
    }
  }
  
  next()
})

export default router

