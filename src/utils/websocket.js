/**
 * WebSocket管理类
 */
class WebSocketManager {
  constructor() {
    this.monitorWs = null
    this.alertsWs = null
    this.monitorCallbacks = []
    this.alertsCallbacks = []
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
  }

  /**
   * 连接监控WebSocket
   */
  connectMonitor(token, callbacks = {}) {
    if (this.monitorWs && this.monitorWs.readyState === WebSocket.OPEN) {
      return
    }

    // 开发环境直接连接后端，生产环境使用配置的URL
    const wsBaseUrl = import.meta.env.DEV
      ? 'ws://localhost:8080'  // 开发环境直接连接后端
      : (import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080')

    // 后端监控WebSocket路径为 /api/ws/monitor（需要包含 /api 前缀）
    const wsUrl = `${wsBaseUrl}/api/ws/monitor?token=${token}`
    
    try {
      this.monitorWs = new WebSocket(wsUrl)
      
      this.monitorWs.onopen = () => {
        console.log('监控WebSocket连接已建立')
        this.reconnectAttempts = 0
        if (callbacks.onOpen) callbacks.onOpen()
      }
      
      this.monitorWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('收到监控消息:', message)
          
          // 触发所有注册的回调
          this.monitorCallbacks.forEach(callback => {
            callback(message)
          })
          
          if (callbacks.onMessage) callbacks.onMessage(message)
        } catch (error) {
          console.error('解析WebSocket消息失败:', error)
        }
      }
      
      this.monitorWs.onerror = (error) => {
        console.error('监控WebSocket错误:', error)
        if (callbacks.onError) callbacks.onError(error)
      }
      
      this.monitorWs.onclose = () => {
        console.log('监控WebSocket连接已关闭')
        if (callbacks.onClose) callbacks.onClose()
        
        // 自动重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          setTimeout(() => {
            this.connectMonitor(token, callbacks)
          }, this.reconnectDelay)
        }
      }
    } catch (error) {
      console.error('创建监控WebSocket连接失败:', error)
    }
  }

  /**
   * 连接告警WebSocket
   */
  connectAlerts(token, callbacks = {}) {
    if (this.alertsWs && this.alertsWs.readyState === WebSocket.OPEN) {
      return
    }

    // 开发环境直接连接后端，生产环境使用配置的URL
    const wsBaseUrl = import.meta.env.DEV
      ? 'ws://localhost:8080'  // 开发环境直接连接后端
      : (import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8080')

    // 告警推送WebSocket路径为 /api/ws/alerts（需要包含 /api 前缀）
    const wsUrl = `${wsBaseUrl}/api/ws/alerts?token=${token}`
    
    try {
      this.alertsWs = new WebSocket(wsUrl)
      
      this.alertsWs.onopen = () => {
        console.log('告警WebSocket连接已建立')
        if (callbacks.onOpen) callbacks.onOpen()
      }
      
      this.alertsWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('收到告警消息:', message)
          
          // 触发所有注册的回调
          this.alertsCallbacks.forEach(callback => {
            callback(message)
          })
          
          if (callbacks.onMessage) callbacks.onMessage(message)
        } catch (error) {
          console.error('解析WebSocket消息失败:', error)
        }
      }
      
      this.alertsWs.onerror = (error) => {
        console.error('告警WebSocket错误:', error)
        if (callbacks.onError) callbacks.onError(error)
      }
      
      this.alertsWs.onclose = () => {
        console.log('告警WebSocket连接已关闭')
        if (callbacks.onClose) callbacks.onClose()
      }
    } catch (error) {
      console.error('创建告警WebSocket连接失败:', error)
    }
  }

  /**
   * 注册监控消息回调
   */
  onMonitorMessage(callback) {
    if (typeof callback === 'function') {
      this.monitorCallbacks.push(callback)
    }
  }

  /**
   * 注册告警消息回调
   */
  onAlertsMessage(callback) {
    if (typeof callback === 'function') {
      this.alertsCallbacks.push(callback)
    }
  }

  /**
   * 移除监控消息回调
   */
  offMonitorMessage(callback) {
    const index = this.monitorCallbacks.indexOf(callback)
    if (index > -1) {
      this.monitorCallbacks.splice(index, 1)
    }
  }

  /**
   * 移除告警消息回调
   */
  offAlertsMessage(callback) {
    const index = this.alertsCallbacks.indexOf(callback)
    if (index > -1) {
      this.alertsCallbacks.splice(index, 1)
    }
  }

  /**
   * 关闭监控WebSocket
   */
  closeMonitor() {
    if (this.monitorWs) {
      this.monitorWs.close()
      this.monitorWs = null
    }
    this.monitorCallbacks = []
  }

  /**
   * 关闭告警WebSocket
   */
  closeAlerts() {
    if (this.alertsWs) {
      this.alertsWs.close()
      this.alertsWs = null
    }
    this.alertsCallbacks = []
  }

  /**
   * 关闭所有WebSocket连接
   */
  closeAll() {
    this.closeMonitor()
    this.closeAlerts()
  }

  /**
   * 向监控WebSocket发送消息（用于门禁控制等场景）
   */
  sendMonitor(data) {
    if (this.monitorWs && this.monitorWs.readyState === WebSocket.OPEN) {
      try {
        this.monitorWs.send(JSON.stringify(data))
      } catch (err) {
        console.error('发送监控WebSocket消息失败:', err, data)
        throw err
      }
    } else {
      console.warn('监控WebSocket未连接，无法发送消息:', data)
      throw new Error('监控WebSocket未连接')
    }
  }

  /**
   * 监控WebSocket是否已连接
   */
  isMonitorConnected() {
    return !!(this.monitorWs && this.monitorWs.readyState === WebSocket.OPEN)
  }
}

// 导出单例
export default new WebSocketManager()

