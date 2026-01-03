import { defineStore } from 'pinia'
import { getAlerts, getAlertStatistics } from '@/api'

export const useAlertStore = defineStore('alert', {
  state: () => ({
    alertList: [],
    alertStatistics: null,
    unreadCount: 0
  }),

  actions: {
    async fetchAlerts(params) {
      try {
        const res = await getAlerts(params)
        if (res.code === 1) {
          this.alertList = res.data.rows || []
          // 计算未读告警数
          this.unreadCount = this.alertList.filter(alert => alert.status === 'pending').length
          return { success: true, total: res.data.total }
        }
        return { success: false }
      } catch (error) {
        console.error('获取告警列表失败:', error)
        return { success: false, message: error.message }
      }
    },

    async fetchStatistics(params) {
      try {
        const res = await getAlertStatistics(params)
        if (res.code === 1) {
          this.alertStatistics = res.data
          return { success: true }
        }
        return { success: false }
      } catch (error) {
        console.error('获取告警统计失败:', error)
        return { success: false }
      }
    },

    addAlert(alert) {
      // 从WebSocket接收新告警时调用
      this.alertList.unshift(alert)
      if (alert.status === 'pending') {
        this.unreadCount++
      }
    }
  }
})

