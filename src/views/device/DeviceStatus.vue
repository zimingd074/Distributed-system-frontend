<template>
  <div class="device-status">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备状态 - {{ deviceName }}</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="实时状态" name="realtime">
          <div v-loading="realtimeLoading" class="status-content">
            <el-row :gutter="20" v-if="realtimeStatus">
              <el-col :span="8">
                <el-card>
                  <div class="status-item">
                    <div class="status-label">门状态</div>
                    <div class="status-value">
                      <el-tag :type="realtimeStatus.doorStatus === 'open' ? 'danger' : 'success'">
                        {{ realtimeStatus.doorStatus === 'open' ? '打开' : '关闭' }}
                      </el-tag>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card>
                  <div class="status-item">
                    <div class="status-label">控制器状态</div>
                    <div class="status-value">
                      <el-tag :type="realtimeStatus.doorControllerStatus === 'normal' ? 'success' : 'danger'">
                        {{ realtimeStatus.doorControllerStatus === 'normal' ? '正常' : realtimeStatus.doorControllerStatus || '异常' }}
                      </el-tag>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card>
                  <div class="status-item">
                    <div class="status-label">最近上报时间</div>
                    <div class="status-value small">
                      {{ realtimeStatus.reportTime || '-' }}
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <div class="door-control">
              <div class="door-control-left">
                <el-form :inline="true" :model="controlForm">
                  <el-form-item label="开门持续时间(秒)">
                    <el-input-number v-model="controlForm.duration" :min="1" :max="300" />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="success" @click="handleOpenDoor" :loading="controlLoading">开门</el-button>
                    <el-button type="warning" @click="handleCloseDoor" :loading="controlLoading">关门</el-button>
                  </el-form-item>
                </el-form>
              </div>
              <div class="door-control-right">
                <el-alert
                  title="通过WebSocket实时下发 open_door / close_door 命令，配合设备端 /device/ws 实现毫秒级门禁控制。"
                  type="info"
                  :closable="false"
                  show-icon
                />
              </div>
            </div>

            <div class="operations-panel" v-if="operations.length">
              <div class="operations-header">最近门禁状态变化</div>
              <el-timeline>
                <el-timeline-item
                  v-for="(op, index) in operations"
                  :key="index"
                  :timestamp="op.reportTime"
                  :type="op.doorStatus === 'open' ? 'danger' : 'success'"
                >
                  门：{{ op.doorStatus || '-' }}，控制器：{{ op.doorControllerStatus || '-' }}
                </el-timeline-item>
              </el-timeline>
            </div>

            <el-button type="primary" @click="loadRealtimeStatus" style="margin-top: 20px;">从接口刷新</el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="历史数据" name="history">
          <div class="history-content">
            <el-form :inline="true" :model="historyForm" style="margin-bottom: 20px;">
              <el-form-item label="开始时间">
                <el-date-picker
                  v-model="historyForm.startTime"
                  type="datetime"
                  placeholder="选择开始时间"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
                />
              </el-form-item>
              <el-form-item label="结束时间">
                <el-date-picker
                  v-model="historyForm.endTime"
                  type="datetime"
                  placeholder="选择结束时间"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
                />
              </el-form-item>
              <el-form-item label="采样间隔">
                <el-select v-model="historyForm.interval" style="width: 150px">
                  <el-option label="1分钟" value="1m" />
                  <el-option label="5分钟" value="5m" />
                  <el-option label="10分钟" value="10m" />
                  <el-option label="30分钟" value="30m" />
                  <el-option label="1小时" value="1h" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="loadHistory">查询</el-button>
              </el-form-item>
            </el-form>

            <el-table :data="historyList" v-loading="historyLoading" style="width: 100%">
              <el-table-column prop="reportTime" label="上报时间" width="180" />
              <el-table-column prop="doorStatus" label="门状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.doorStatus === 'open' ? 'danger' : 'success'">
                    {{ row.doorStatus === 'open' ? '打开' : '关闭' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="doorControllerStatus" label="控制器状态" width="150">
                <template #default="{ row }">
                  <el-tag :type="row.doorControllerStatus === 'normal' ? 'success' : 'warning'">
                    {{ row.doorControllerStatus || '-' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="心跳记录" name="heartbeat">
          <el-form :inline="true" :model="heartbeatForm" style="margin-bottom: 20px;">
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="heartbeatForm.startTime"
                type="datetime"
                placeholder="选择开始时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="heartbeatForm.endTime"
                type="datetime"
                placeholder="选择结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
            <el-form-item label="记录数">
              <el-input-number v-model="heartbeatForm.limit" :min="1" :max="1000" style="width: 150px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadHeartbeat">查询</el-button>
            </el-form-item>
          </el-form>
          
          <el-table :data="heartbeatList" v-loading="heartbeatLoading" style="width: 100%">
            <el-table-column prop="heartbeatTime" label="心跳时间" width="180" />
            <el-table-column prop="ipAddress" label="IP地址" width="150" />
            <el-table-column prop="responseTime" label="响应时间(ms)" width="120">
              <template #default="{ row }">
                {{ row.responseTime || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="extraData" label="额外数据">
              <template #default="{ row }">
                <pre v-if="row.extraData" style="margin: 0; font-size: 12px;">{{ JSON.stringify(row.extraData, null, 2) }}</pre>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDeviceStatus, getDeviceStatusHistory, getDeviceHeartbeat, getDeviceDetail } from '@/api'
import { ElMessage } from 'element-plus'
import wsManager from '@/utils/websocket'
import { useDeviceStore } from '@/stores/device'

const route = useRoute()
const deviceId = Number(route.params.id)
const deviceStore = useDeviceStore()

const deviceName = ref('')
const activeTab = ref('realtime')
const realtimeLoading = ref(false)
const historyLoading = ref(false)
const heartbeatLoading = ref(false)
const realtimeStatus = ref(null)
const heartbeatList = ref([])
const historyList = ref([])
const operations = ref([])
const controlForm = reactive({
  duration: 5
})
const controlLoading = ref(false)
const deviceOnlineStatus = ref(0) // 设备在线状态

const historyForm = reactive({
  startTime: '',
  endTime: '',
  interval: '5m'
})

const heartbeatForm = reactive({
  startTime: '',
  endTime: '',
  limit: 100
})

const loadRealtimeStatus = async () => {
  realtimeLoading.value = true
  try {
    const res = await getDeviceStatus(deviceId)
    if (res.code === 1) {
      realtimeStatus.value = res.data
      deviceName.value = res.data.deviceName
    }
    
    // 同时获取设备详情以获取在线状态
    try {
      const deviceRes = await getDeviceDetail(deviceId)
      if (deviceRes.code === 1) {
        deviceOnlineStatus.value = deviceRes.data.onlineStatus || 0
      }
    } catch (e) {
      // 忽略错误，使用store中的状态
      const device = deviceStore.deviceList.find(d => d.id === deviceId)
      if (device) {
        deviceOnlineStatus.value = device.onlineStatus || 0
      }
    }
  } catch (error) {
    ElMessage.error('获取实时状态失败')
  } finally {
    realtimeLoading.value = false
  }
}

const loadHistory = async () => {
  if (!historyForm.startTime || !historyForm.endTime) {
    ElMessage.warning('请选择时间范围')
    return
  }
  
  historyLoading.value = true
  try {
    const res = await getDeviceStatusHistory(deviceId, historyForm)
    if (res.code === 1) {
      historyList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取历史数据失败')
  } finally {
    historyLoading.value = false
  }
}

const loadHeartbeat = async () => {
  heartbeatLoading.value = true
  try {
    const params = {
      startTime: heartbeatForm.startTime || '',
      endTime: heartbeatForm.endTime || '',
      limit: heartbeatForm.limit || 100
    }
    const res = await getDeviceHeartbeat(deviceId, params)
    if (res.code === 1) {
      heartbeatList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取心跳记录失败')
  } finally {
    heartbeatLoading.value = false
  }
}

const handleMonitorMessage = (message) => {
  if (!message) return
  const payload = message.data || message
  const msgDeviceId = payload.deviceId || payload.id || payload.device_id
  if (!msgDeviceId || Number(msgDeviceId) !== deviceId) return

  // 更新在线状态
  if (typeof payload.onlineStatus !== 'undefined') {
    deviceOnlineStatus.value = payload.onlineStatus
  }

  if (payload.doorStatus || payload.doorControllerStatus || payload.statusType === 'access') {
    realtimeStatus.value = {
      ...(realtimeStatus.value || {}),
      doorStatus: payload.doorStatus || realtimeStatus.value?.doorStatus,
      doorControllerStatus: payload.doorControllerStatus || realtimeStatus.value?.doorControllerStatus,
      reportTime: payload.reportTime || realtimeStatus.value?.reportTime
    }

    operations.value.unshift({
      doorStatus: payload.doorStatus,
      doorControllerStatus: payload.doorControllerStatus,
      reportTime: payload.reportTime || new Date().toISOString().slice(0, 19).replace('T', ' ')
    })

    if (operations.value.length > 50) {
      operations.value.splice(50)
    }
  }

  if (message.type === 'command_result' && payload.commandLogId) {
    ElMessage.success('门禁命令执行结果已返回')
  }
}

const handleOpenDoor = async () => {
  if (!wsManager.isMonitorConnected()) {
    ElMessage.error('监控WebSocket未连接，无法下发开门命令')
    return
  }
  
  // 检查设备是否在线（WebSocket连接）
  if (deviceOnlineStatus.value !== 1) {
    ElMessage.error('设备未在线，无法发送命令。请确保设备已通过WebSocket连接到服务器。')
    return
  }
  
  controlLoading.value = true
  try {
    wsManager.sendMonitor({
      type: 'door_command',
      data: {
        deviceId,
        commandCode: 'open_door',
        commandParams: {
          duration: controlForm.duration
        }
      },
      timestamp: Date.now()
    })
    ElMessage.success('开门命令已通过WebSocket发送')
  } catch (e) {
    ElMessage.error('开门命令发送失败')
  } finally {
    controlLoading.value = false
  }
}

const handleCloseDoor = async () => {
  if (!wsManager.isMonitorConnected()) {
    ElMessage.error('监控WebSocket未连接，无法下发关门命令')
    return
  }
  
  // 检查设备是否在线（WebSocket连接）
  if (deviceOnlineStatus.value !== 1) {
    ElMessage.error('设备未在线，无法发送命令。请确保设备已通过WebSocket连接到服务器。')
    return
  }
  
  controlLoading.value = true
  try {
    wsManager.sendMonitor({
      type: 'door_command',
      data: {
        deviceId,
        commandCode: 'close_door',
        commandParams: {}
      },
      timestamp: Date.now()
    })
    ElMessage.success('关门命令已通过WebSocket发送')
  } catch (e) {
    ElMessage.error('关门命令发送失败')
  } finally {
    controlLoading.value = false
  }
}

onMounted(() => {
  loadRealtimeStatus()

  // 设置默认时间范围：当天 0 点 到 当天 24 点（23:59:59）
  const now = new Date()
  const startTime = new Date(now)
  startTime.setHours(0, 0, 0, 0)
  const endTime = new Date(now)
  endTime.setHours(23, 59, 59, 999)

  const formatDateTime = (date) => {
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const h = pad(date.getHours())
    const mm = pad(date.getMinutes())
    const s = pad(date.getSeconds())
    return `${y}-${m}-${d} ${h}:${mm}:${s}`
  }

  historyForm.startTime = formatDateTime(startTime)
  historyForm.endTime = formatDateTime(endTime)
  heartbeatForm.startTime = formatDateTime(startTime)
  heartbeatForm.endTime = formatDateTime(endTime)
  
  // 如果当前标签是心跳记录，加载数据
  if (activeTab.value === 'heartbeat') {
    loadHeartbeat()
  }

  wsManager.onMonitorMessage(handleMonitorMessage)
})

onUnmounted(() => {
  wsManager.offMonitorMessage(handleMonitorMessage)
})
</script>

<style scoped>
.device-status {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-content {
  padding: 20px 0;
}

.status-item {
  text-align: center;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.status-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
}

.history-content {
  padding: 20px 0;
  min-height: 420px;
}
</style>

