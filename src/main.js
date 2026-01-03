import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import wsManager from '@/utils/websocket'
import { useDeviceStore } from '@/stores/device'
import { useNotificationStore } from '@/stores/notification'
import { useAlertStore } from '@/stores/alert'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// create pinia instance so we can use stores below
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 全局初始化：自动连接监控 WebSocket（如果有 token）并注册监控回调
try {
  const token = localStorage.getItem('accessToken')
  if (token) {
    // 连接监控 WS，后端需广播设备状态变化到 /ws/monitor
    wsManager.connectMonitor(token, {})

    // 连接告警 WS
    wsManager.connectAlerts(token, {})

    // 获取 stores
    const deviceStore = useDeviceStore()
    const notificationStore = useNotificationStore()
    const alertStore = useAlertStore()

    // 用于跟踪设备状态变化，避免重复通知
    const deviceStateCache = new Map()

    // 注册回调：收到监控消息时更新 deviceStore 中对应设备项
    wsManager.onMonitorMessage((message) => {
      if (!message) return
      const payload = message.data || message
      const deviceId = payload.deviceId || payload.id || payload.device_id
      const deviceCode = payload.deviceCode || payload.device_code

      if (!deviceStore || !Array.isArray(deviceStore.deviceList)) return

      // 找到设备在本地列表中的索引
      let idx = -1
      if (deviceId) {
        idx = deviceStore.deviceList.findIndex(d => d.id === Number(deviceId))
      }
      if (idx === -1 && deviceCode) {
        idx = deviceStore.deviceList.findIndex(d => String(d.deviceCode) === String(deviceCode))
      }

      if (idx > -1) {
        const device = deviceStore.deviceList[idx]
        const previousState = deviceStateCache.get(device.id) || {
          onlineStatus: device.onlineStatus,
          doorStatus: device.doorStatus,
          doorControllerStatus: device.doorControllerStatus
        }

        const updated = { ...device }
        // 更新接收到的字段，保持原有其它字段不变
        if (typeof payload.onlineStatus !== 'undefined') updated.onlineStatus = payload.onlineStatus
        // 时间格式转换：将时间戳或 ISO 字符串转换为 "YYYY-MM-DD HH:mm:ss" 格式
        const formatTimestamp = (ts) => {
          if (!ts) return null
          try {
            const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
            if (isNaN(d.getTime())) return ts // 如果无法解析，返回原值
            const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
          } catch (e) {
            return ts // 转换失败返回原值
          }
        }
        if (payload.lastHeartbeatTime || payload.reportTime || payload.heartbeatTime) {
          const timeValue = payload.lastHeartbeatTime || payload.reportTime || payload.heartbeatTime
          updated.lastHeartbeatTime = formatTimestamp(timeValue) || timeValue
        }
        // 门禁状态更新（后端会广播 doorStatus）
        if (typeof payload.doorStatus !== 'undefined') updated.doorStatus = payload.doorStatus
        if (typeof payload.doorControllerStatus !== 'undefined') updated.doorControllerStatus = payload.doorControllerStatus
        if (payload.status) updated.status = payload.status
        // 原子替换，触发响应式更新
        deviceStore.deviceList.splice(idx, 1, updated)

        // 检测状态变化并发送通知
        // 1. 检测设备在线状态变化
        if (previousState.onlineStatus !== updated.onlineStatus) {
          if (updated.onlineStatus === 0) {
            notificationStore.addNotification({
              type: 'device_status',
              title: '设备离线',
              message: `设备"${updated.deviceName || updated.deviceCode}"已离线`,
              severity: 'warning',
              data: {
                deviceId: updated.id,
                deviceName: updated.deviceName,
                deviceCode: updated.deviceCode
              }
            })
          } else if (updated.onlineStatus === 1 && previousState.onlineStatus === 0) {
            notificationStore.addNotification({
              type: 'device_status',
              title: '设备上线',
              message: `设备"${updated.deviceName || updated.deviceCode}"已上线`,
              severity: 'success',
              data: {
                deviceId: updated.id,
                deviceName: updated.deviceName,
                deviceCode: updated.deviceCode
              }
            })
          }
        }

        // 2. 检测门禁状态变化
        if (previousState.doorStatus !== updated.doorStatus && typeof updated.doorStatus !== 'undefined') {
          const doorStatusMap = {
            'open': '开启',
            'closed': '关闭',
            'opening': '开启中',
            'closing': '关闭中',
            'fault': '故障'
          }
          const statusText = doorStatusMap[updated.doorStatus] || updated.doorStatus
          let severity = 'info'
          if (updated.doorStatus === 'fault') {
            severity = 'error'
          } else if (updated.doorStatus === 'open') {
            severity = 'warning'
          }

          notificationStore.addNotification({
            type: 'door_status',
            title: '门禁状态变化',
            message: `设备"${updated.deviceName || updated.deviceCode}"门禁状态变更为：${statusText}`,
            severity,
            data: {
              deviceId: updated.id,
              deviceName: updated.deviceName,
              deviceCode: updated.deviceCode,
              doorStatus: updated.doorStatus
            }
          })
        }

        // 3. 检测门禁控制器状态变化
        if (previousState.doorControllerStatus !== updated.doorControllerStatus && typeof updated.doorControllerStatus !== 'undefined') {
          if (updated.doorControllerStatus === 'fault' || updated.doorControllerStatus === 'error') {
            notificationStore.addNotification({
              type: 'device_status',
              title: '门禁控制器故障',
              message: `设备"${updated.deviceName || updated.deviceCode}"门禁控制器出现故障`,
              severity: 'error',
              data: {
                deviceId: updated.id,
                deviceName: updated.deviceName,
                deviceCode: updated.deviceCode,
                doorControllerStatus: updated.doorControllerStatus
              }
            })
          }
        }

        // 更新状态缓存
        deviceStateCache.set(updated.id, {
          onlineStatus: updated.onlineStatus,
          doorStatus: updated.doorStatus,
          doorControllerStatus: updated.doorControllerStatus
        })
      } else {
        // 可选：如果未找到设备，忽略或触发刷新 device 列表
        // deviceStore.fetchDevices({ page: 1, pageSize: 200 })
      }
    })

    // 监听告警WebSocket消息
    wsManager.onAlertsMessage((message) => {
      if (!message) return
      
      const payload = message.data || message
      const alertType = message.type || payload.type || 'alert'
      
      // 如果是新告警消息
      if (alertType === 'new_alert' || alertType === 'alert_report') {
        const alertData = payload.data || payload
        
        // 添加到告警store
        if (alertStore) {
          alertStore.addAlert({
            id: alertData.alertId || alertData.id,
            deviceId: alertData.deviceId,
            deviceName: alertData.deviceName,
            alertType: alertData.alertType,
            alertLevel: alertData.alertLevel || alertData.severity,
            alertMessage: alertData.alertMessage || alertData.message,
            alertTime: alertData.alertTime || alertData.timestamp,
            status: 'pending'
          })
        }

        // 发送通知
        const severityMap = {
          'info': 'info',
          'warning': 'warning',
          'error': 'error',
          'critical': 'error'
        }
        const severity = severityMap[alertData.alertLevel || alertData.severity || 'warning'] || 'warning'
        
        notificationStore.addNotification({
          type: 'alert',
          title: '门禁告警',
          message: alertData.alertMessage || alertData.message || '收到新的告警信息',
          severity,
          data: {
            deviceId: alertData.deviceId,
            deviceName: alertData.deviceName,
            alertId: alertData.alertId || alertData.id,
            alertType: alertData.alertType,
            alertLevel: alertData.alertLevel || alertData.severity
          }
        })
      }
    })
    // 离线检测：定期检查最后心跳时间，超过阈值则标记为离线并更新 store（客户端侧回退方案）
    const OFFLINE_THRESHOLD_SECONDS = 90 // 可根据后端心跳间隔调整
    setInterval(() => {
      try {
        const now = Date.now()
        if (!deviceStore || !Array.isArray(deviceStore.deviceList)) return
        deviceStore.deviceList.forEach((d, idx) => {
          const last = d.lastHeartbeatTime || d.last_heartbeat_time || null
          if (!last) return
          const lastTs = new Date(last).getTime()
          if (isNaN(lastTs)) return
          if ((now - lastTs) / 1000 > OFFLINE_THRESHOLD_SECONDS && d.onlineStatus === 1) {
            const updated = { ...d, onlineStatus: 0, status: 'offline' }
            deviceStore.deviceList.splice(idx, 1, updated)
          }
        })
      } catch (e) {
        // ignore
      }
    }, 30000)
  }
} catch (e) {
  // 忽略初始化错误
  console.error('初始化监控WebSocket失败', e)
}

app.mount('#app')
