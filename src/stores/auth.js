import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi, getProfile, refreshToken as refreshTokenApi } from '@/api'
import wsManager from '@/utils/websocket'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    userInfo: null,
    isAdmin: false,
    roles: [],
    permissions: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken,
    hasPermission: (state) => (permission) => {
      if (state.isAdmin) return true
      return state.permissions.includes(permission) || state.permissions.some(p => p.endsWith(':*'))
    }
  },

  actions: {
    async login(credentials) {
      try {
        const res = await loginApi(credentials)
        if (res.code === 1) {
          const { accessToken, refreshToken, userId, username, realName, isAdmin, roles, permissions } = res.data
          
          this.accessToken = accessToken
          this.refreshToken = refreshToken
          this.isAdmin = isAdmin
          this.roles = roles
          this.permissions = permissions
          
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)
          
          // 获取用户详细信息
          await this.fetchProfile()
          
          // 连接WebSocket
          this.connectWebSockets()
          
          return { success: true }
        }
        return { success: false, message: res.msg }
      } catch (error) {
        return { success: false, message: error.message || '登录失败' }
      }
    },

    async logout() {
      try {
        if (this.accessToken) {
          await logoutApi()
        }
      } catch (error) {
        console.error('登出失败:', error)
      } finally {
        this.accessToken = ''
        this.refreshToken = ''
        this.userInfo = null
        this.isAdmin = false
        this.roles = []
        this.permissions = []
        
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        
        // 关闭WebSocket连接
        wsManager.closeAll()
      }
    },

    async fetchProfile() {
      try {
        const res = await getProfile()
        if (res.code === 1) {
          this.userInfo = res.data
          this.isAdmin = res.data.isAdmin
          this.roles = res.data.roles || []
          this.permissions = res.data.permissions || []
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    },

    async refreshToken() {
      try {
        const res = await refreshTokenApi(this.refreshToken)
        if (res.code === 1) {
          this.accessToken = res.data.accessToken
          this.refreshToken = res.data.refreshToken
          localStorage.setItem('accessToken', res.data.accessToken)
          localStorage.setItem('refreshToken', res.data.refreshToken)
          return true
        }
        return false
      } catch (error) {
        console.error('刷新Token失败:', error)
        this.logout()
        return false
      }
    },

    connectWebSockets() {
      if (this.accessToken) {
        // 连接监控WebSocket
        wsManager.connectMonitor(this.accessToken, {
          onMessage: (message) => {
            // 可以在这里处理实时监控消息
            console.log('监控消息:', message)
          }
        })

        // 连接告警WebSocket
        wsManager.connectAlerts(this.accessToken, {
          onMessage: (message) => {
            // 可以在这里处理告警消息
            console.log('告警消息:', message)
          }
        })
      }
    }
  }
})

