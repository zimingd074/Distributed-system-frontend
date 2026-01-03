import { defineStore } from 'pinia'
import { ElNotification } from 'element-plus'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    // 通知配置
    config: {
      // 是否启用声音提醒
      enableSound: true,
      // 是否启用桌面通知
      enableDesktopNotification: false,
      // 通知持续时间（毫秒）
      duration: 5000
    }
  }),

  actions: {
    /**
     * 添加通知
     * @param {Object} notification - 通知对象
     * @param {string} notification.type - 通知类型: 'alert' | 'door_status' | 'device_status' | 'info'
     * @param {string} notification.title - 通知标题
     * @param {string} notification.message - 通知内容
     * @param {string} notification.severity - 严重程度: 'success' | 'warning' | 'error' | 'info'
     * @param {Object} notification.data - 附加数据
     */
    addNotification(notification) {
      const {
        type = 'info',
        title = '通知',
        message = '',
        severity = 'info',
        data = {},
        timestamp = Date.now()
      } = notification

      const notificationItem = {
        id: `notification_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        severity,
        data,
        timestamp,
        read: false
      }

      this.notifications.unshift(notificationItem)
      if (!notificationItem.read) {
        this.unreadCount++
      }

      // 限制通知列表长度，保留最近100条
      if (this.notifications.length > 100) {
        const removed = this.notifications.pop()
        if (!removed.read) {
          this.unreadCount--
        }
      }

      // 显示Element Plus通知
      this.showElementNotification(notificationItem)

      // 播放提示音（如果启用）
      if (this.config.enableSound && severity === 'error' || severity === 'warning') {
        this.playNotificationSound()
      }

      // 桌面通知（如果启用且浏览器支持）
      if (this.config.enableDesktopNotification) {
        this.showDesktopNotification(notificationItem)
      }

      return notificationItem
    },

    /**
     * 显示Element Plus通知
     */
    showElementNotification(notification) {
      const { title, message, severity, data } = notification

      // 根据类型和严重程度确定通知类型
      let notificationType = severity
      if (severity === 'critical') {
        notificationType = 'error'
      }

      // 构建详细消息
      let fullMessage = message
      if (data.deviceName) {
        fullMessage = `[${data.deviceName}] ${message}`
      }

      ElNotification({
        title,
        message: fullMessage,
        type: notificationType,
        duration: this.config.duration,
        position: 'top-right',
        dangerouslyUseHTMLString: false,
        onClick: () => {
          // 点击通知时可以跳转到相关页面
          if (data.deviceId && window.location.pathname !== `/devices/${data.deviceId}/status`) {
            // 可以在这里添加路由跳转逻辑
          }
        }
      })
    },

    /**
     * 播放提示音
     */
    playNotificationSound() {
      try {
        // 使用Web Audio API创建提示音
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (error) {
        console.warn('无法播放提示音:', error)
      }
    },

    /**
     * 显示桌面通知
     */
    async showDesktopNotification(notification) {
      if (!('Notification' in window)) {
        return
      }

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        })
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission()
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id
          })
        }
      }
    },

    /**
     * 标记通知为已读
     */
    markAsRead(notificationId) {
      const notification = this.notifications.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        notification.read = true
        this.unreadCount--
      }
    },

    /**
     * 标记所有通知为已读
     */
    markAllAsRead() {
      this.notifications.forEach(n => {
        if (!n.read) {
          n.read = true
        }
      })
      this.unreadCount = 0
    },

    /**
     * 删除通知
     */
    removeNotification(notificationId) {
      const index = this.notifications.findIndex(n => n.id === notificationId)
      if (index > -1) {
        const notification = this.notifications[index]
        if (!notification.read) {
          this.unreadCount--
        }
        this.notifications.splice(index, 1)
      }
    },

    /**
     * 清空所有通知
     */
    clearAll() {
      this.notifications = []
      this.unreadCount = 0
    },

    /**
     * 更新配置
     */
    updateConfig(config) {
      this.config = { ...this.config, ...config }
    }
  }
})

