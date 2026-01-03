import { defineStore } from 'pinia'
import { getDevices, getDeviceStatistics } from '@/api'

export const useDeviceStore = defineStore('device', {
  state: () => ({
    deviceList: [],
    deviceStatistics: null,
    currentDevice: null
  }),

  actions: {
    async fetchDevices(params) {
      try {
        const res = await getDevices(params)
        if (res.code === 1) {
          this.deviceList = res.data.rows || []
          return { success: true, total: res.data.total }
        }
        return { success: false }
      } catch (error) {
        console.error('获取设备列表失败:', error)
        return { success: false, message: error.message }
      }
    },

    async fetchStatistics() {
      try {
        const res = await getDeviceStatistics()
        if (res.code === 1) {
          this.deviceStatistics = res.data
          return { success: true }
        }
        return { success: false }
      } catch (error) {
        console.error('获取设备统计失败:', error)
        return { success: false }
      }
    },

    setCurrentDevice(device) {
      this.currentDevice = device
    }
  }
})

