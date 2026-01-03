<template>
  <div class="notification-center">
    <!-- 通知图标和徽章 -->
    <el-badge :value="notificationStore.unreadCount" :hidden="notificationStore.unreadCount === 0" class="notification-badge">
      <el-button
        :icon="Bell"
        circle
        @click="drawerVisible = true"
        class="notification-button"
      />
    </el-badge>

    <!-- 通知抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="通知中心"
      :size="400"
      direction="rtl"
    >
      <template #header>
        <div class="drawer-header">
          <span>通知中心</span>
          <div class="drawer-actions">
            <el-button
              v-if="notificationStore.unreadCount > 0"
              type="text"
              size="small"
              @click="handleMarkAllRead"
            >
              全部已读
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="handleClearAll"
            >
              清空
            </el-button>
          </div>
        </div>
      </template>

      <div class="notification-list" v-if="notificationStore.notifications.length > 0">
        <div
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          :class="['notification-item', { unread: !notification.read }]"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon">
            <el-icon :size="20" :color="getSeverityColor(notification.severity)">
              <component :is="getNotificationIcon(notification.type)" />
            </el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-meta">
              <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
              <el-tag
                v-if="notification.data.deviceName"
                size="small"
                type="info"
                class="device-tag"
              >
                {{ notification.data.deviceName }}
              </el-tag>
            </div>
          </div>
          <div class="notification-actions">
            <el-button
              type="text"
              :icon="Close"
              size="small"
              @click.stop="handleRemoveNotification(notification.id)"
            />
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无通知" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { Bell, Close, Warning, InfoFilled, SuccessFilled, CircleClose } from '@element-plus/icons-vue'

const router = useRouter()
const notificationStore = useNotificationStore()
const drawerVisible = ref(false)

// 获取通知图标
const getNotificationIcon = (type) => {
  const iconMap = {
    alert: Warning,
    door_status: InfoFilled,
    device_status: InfoFilled,
    info: InfoFilled
  }
  return iconMap[type] || InfoFilled
}

// 获取严重程度颜色
const getSeverityColor = (severity) => {
  const colorMap = {
    success: '#67C23A',
    warning: '#E6A23C',
    error: '#F56C6C',
    critical: '#F56C6C',
    info: '#409EFF'
  }
  return colorMap[severity] || '#909399'
}

// 格式化时间
const formatTime = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

// 处理通知点击
const handleNotificationClick = (notification) => {
  notificationStore.markAsRead(notification.id)
  
  // 根据通知类型跳转到相应页面
  if (notification.data.deviceId) {
    if (notification.type === 'door_status' || notification.type === 'device_status') {
      router.push(`/devices/${notification.data.deviceId}/status`)
    }
  } else if (notification.type === 'alert' && notification.data.alertId) {
    router.push(`/alerts`)
  }
  
  drawerVisible.value = false
}

// 标记全部已读
const handleMarkAllRead = () => {
  notificationStore.markAllAsRead()
}

// 清空所有通知
const handleClearAll = () => {
  notificationStore.clearAll()
}

// 删除通知
const handleRemoveNotification = (id) => {
  notificationStore.removeNotification(id)
}
</script>

<style scoped>
.notification-center {
  position: relative;
}

.notification-badge {
  margin-right: 10px;
}

.notification-button {
  border: none;
  background: transparent;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.drawer-actions {
  display: flex;
  gap: 10px;
}

.notification-list {
  padding: 0;
}

.notification-item {
  display: flex;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.unread {
  background-color: #ecf5ff;
}

.notification-item.unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: #409eff;
}

.notification-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 8px;
  word-break: break-word;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.notification-time {
  flex-shrink: 0;
}

.device-tag {
  flex-shrink: 0;
}

.notification-actions {
  margin-left: 8px;
  flex-shrink: 0;
}
</style>

