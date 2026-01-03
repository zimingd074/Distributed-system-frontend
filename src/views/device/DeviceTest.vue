<template>
  <div class="device-test">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备端接口测试</span>
          <el-button type="danger" @click="handleDisconnect" :disabled="!wsConnected">断开WebSocket</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- WebSocket测试 -->
        <el-tab-pane label="WebSocket测试" name="websocket">
          <el-form :model="wsForm" label-width="150px" style="max-width: 600px;">
            <el-form-item label="WebSocket地址">
              <el-input v-model="wsForm.url" placeholder="ws://localhost:8080/api/device/ws" />
            </el-form-item>
            <el-form-item label="设备编码">
              <el-select
                v-model="wsForm.deviceCode"
                placeholder="请选择设备（从设备列表）"
                filterable
                clearable
                style="width: 100%;"
              >
                <el-option
                  v-for="d in deviceStore.deviceList"
                  :key="d.id"
                  :label="`${d.deviceCode} ${d.deviceName ? '(' + d.deviceName + ')' : ''}`"
                  :value="d.deviceCode"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="设备密钥">
              <el-input
                v-model="wsForm.deviceSecret"
                type="password"
                show-password
                placeholder="手动输入"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleConnect" :disabled="wsConnected" :loading="wsConnecting">连接WebSocket</el-button>
              <el-button type="danger" @click="handleDisconnect" :disabled="!wsConnected">断开连接</el-button>
            </el-form-item>
            <el-form-item label="连接状态">
              <el-tag :type="wsConnected ? 'success' : 'danger'">
                {{ wsConnected ? '已连接' : '未连接' }}
              </el-tag>
            </el-form-item>
          </el-form>

          <el-divider>当前门禁状态</el-divider>
          <el-descriptions :column="2" border style="margin-bottom: 20px;">
            <el-descriptions-item label="门状态">
              <el-tag :type="currentDoorStatus === 'open' ? 'warning' : 'success'">
                {{ currentDoorStatus === 'open' ? '打开' : '关闭' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="控制器状态">
              <el-tag :type="currentControllerStatus === 'normal' ? 'success' : 'danger'">
                {{ currentControllerStatus === 'normal' ? '正常' : currentControllerStatus || '未知' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <el-divider>手动上报状态</el-divider>
          <el-form :model="statusReportForm" label-width="150px" style="max-width: 600px; margin-bottom: 20px;">
            <el-form-item label="门状态">
              <el-select v-model="statusReportForm.doorStatus" style="width: 100%">
                <el-option label="打开 (open)" value="open" />
                <el-option label="关闭 (closed)" value="closed" />
              </el-select>
            </el-form-item>
            <el-form-item label="控制器状态">
              <el-select v-model="statusReportForm.doorControllerStatus" style="width: 100%">
                <el-option label="正常 (normal)" value="normal" />
                <el-option label="故障 (fault)" value="fault" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSendStatusReport" :disabled="!wsConnected">上报状态</el-button>
            </el-form-item>
          </el-form>

          <el-divider>WebSocket消息</el-divider>
          <div class="ws-messages">
            <div 
              v-for="(msg, index) in wsMessages" 
              :key="index" 
              class="message-item"
              :class="msg.direction"
            >
              <div class="message-header">
                <span class="direction">{{ msg.direction === 'send' ? '发送' : '接收' }}</span>
                <span class="time">{{ msg.time }}</span>
              </div>
              <pre class="message-content">{{ JSON.stringify(msg.data, null, 2) }}</pre>
            </div>
          </div>
          <div style="margin-top: 10px;">
            <el-button size="small" @click="wsMessages = []">清空消息</el-button>
            <el-button size="small" @click="handleSendHeartbeat" :disabled="!wsConnected">发送心跳</el-button>
          </div>
          
          <el-divider>发送告警</el-divider>
          <el-form :model="alertForm" label-width="120px" style="max-width: 600px; margin-top: 10px;">
            <el-form-item label="告警类型">
              <el-select v-model="alertForm.alertType" style="width: 100%">
                <el-option label="门未关超时" value="door_not_closed_timeout" />
                <el-option label="异常开启" value="illegal_open" />
                <el-option label="控制器故障" value="door_controller_fault" />
              </el-select>
            </el-form-item>
            <el-form-item label="告警级别">
              <el-select v-model="alertForm.alertLevel" style="width: 100%">
                <el-option label="信息 (info)" value="info" />
                <el-option label="警告 (warning)" value="warning" />
                <el-option label="错误 (error)" value="error" />
                <el-option label="严重 (critical)" value="critical" />
              </el-select>
            </el-form-item>
            <el-form-item label="告警信息">
              <el-input type="textarea" v-model="alertForm.alertMessage" placeholder="描述告警详情" rows="3" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSendAlert" :disabled="!wsForm.deviceCode">发送告警</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '@/stores/device'
import { deviceGetConfig, sendAlert } from '@/api'

const activeTab = ref('websocket')

// WebSocket相关
const wsForm = reactive({
  url: 'ws://localhost:8080/api/device/ws',
  deviceCode: '',
  deviceSecret: ''
})
const wsConnected = ref(false)
const wsConnecting = ref(false)
const wsMessages = ref([])
let ws = null
let heartbeatIntervalId = null
let heartbeatIntervalMs = 60000 // 默认 60 秒
const deviceStore = useDeviceStore()
let reportIntervalId = null
let reportIntervalMs = 300000 // 默认 300 秒 (5 分钟)
// 如果通过 applyConfigs 获取到心跳间隔配置，则优先使用该配置，避免被服务端 auth_ack/heartbeat_ack 覆盖
let configHeartbeatApplied = false

// 当前门禁状态
const currentDoorStatus = ref('closed')
const currentControllerStatus = ref('normal')

// 选择设备仅用于选择 deviceCode，下方密钥需手动输入（出于安全考虑，不自动填充 deviceSecret）

onMounted(() => {
  // 尝试加载设备列表到 store（便于下拉显示）
  try {
    deviceStore.fetchDevices({ page: 1, pageSize: 200 })
  } catch (e) {
    // ignore
  }
})

// 应用配置数组 { configKey, configValue }
const applyConfigs = (configs) => {
  try {
    if (!Array.isArray(configs)) return
    let heartbeatSec = null
    let reportSec = null
    configs.forEach(c => {
      const key = c.configKey || c.config_key
      const val = c.configValue || c.config_value || c.value
      if (!key) return
      if (key === 'heartbeat_interval') {
        heartbeatSec = Number(val)
      } else if (key === 'report_interval') {
        reportSec = Number(val)
      }
    })

    if (!isNaN(heartbeatSec) && heartbeatSec > 0) {
      heartbeatIntervalMs = heartbeatSec * 1000
      // 标记为通过配置已应用心跳间隔，优先级高于服务端 ack
      configHeartbeatApplied = true
      // 重新启动心跳定时器（不立即发送，交由连接后的统一入口决定是否发送一次）
      stopAutoHeartbeat()
      startAutoHeartbeat(false)
    }
    if (!isNaN(reportSec) && reportSec > 0) {
      reportIntervalMs = reportSec * 1000
      stopAutoReport()
      // 不立即发送，避免与连接成功后的单次上报重复
      startAutoReport(false)
    }
  } catch (e) {
    console.error('applyConfigs error', e)
  }
}

// 获取设备配置并应用（优先使用 HTTP 拉取配置作为注册/测试场景）
const fetchAndApplyDeviceConfigs = async () => {
  try {
    if (!wsForm.deviceCode) return
    const params = { deviceCode: wsForm.deviceCode }
    // 优先使用 device secret if available
    if (wsForm.deviceSecret) params.deviceSecret = wsForm.deviceSecret
    const res = await deviceGetConfig(params)
    if (res && res.code === 1 && Array.isArray(res.data)) {
      applyConfigs(res.data)
    } else if (res && res.data && Array.isArray(res.data.data)) {
      // 兼容嵌套返回
      applyConfigs(res.data.data)
    }
  } catch (e) {
    // ignore
  }
}

const startAutoReport = (sendImmediate = false) => {
  try {
    if (reportIntervalId) {
      clearInterval(reportIntervalId)
      reportIntervalId = null
    }
    if (sendImmediate) {
      handleSendStatusReport()
    }
    reportIntervalId = setInterval(() => {
      handleSendStatusReport()
    }, reportIntervalMs)
  } catch (e) {
    console.error('startAutoReport error', e)
  }
}

const stopAutoReport = () => {
  if (reportIntervalId) {
    clearInterval(reportIntervalId)
    reportIntervalId = null
  }
}

// 状态上报表单
const statusReportForm = reactive({
  doorStatus: 'closed',
  doorControllerStatus: 'normal'
})

// 告警上报表单
const alertForm = reactive({
  alertType: 'door_not_closed_timeout',
  alertLevel: 'warning',
  alertMessage: ''
})

// 开门定时器（用于自动关门）
let doorOpenTimer = null

// 将时间戳(ms)或 Date 对象格式化为 "YYYY-MM-DD HH:mm:ss"
const formatTimestamp = (ts) => {
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch (e) {
    return ''
  }
}

// 本地更新 store 中设备的最后心跳时间与在线状态（立即更新 UI）
const updateDeviceHeartbeatLocal = (deviceCode, timeStr, onlineStatus = 1) => {
  try {
    if (!deviceStore || !Array.isArray(deviceStore.deviceList)) return
    // 尝试精确匹配 deviceCode（忽略大小写），如果未找到则尝试按 id（传入为数字）
    let idx = -1
    if (deviceCode) {
      idx = deviceStore.deviceList.findIndex(d => String(d.deviceCode).toLowerCase() === String(deviceCode).toLowerCase())
    }
    if (idx === -1 && !isNaN(Number(deviceCode))) {
      idx = deviceStore.deviceList.findIndex(d => d.id === Number(deviceCode))
    }
    if (idx > -1) {
      const updated = { ...deviceStore.deviceList[idx] }
      if (timeStr) updated.lastHeartbeatTime = timeStr
      updated.onlineStatus = onlineStatus
      deviceStore.deviceList.splice(idx, 1, updated)
      console.log('[DeviceTest] updated deviceStore for', deviceCode, '->', updated)
    }
  } catch (e) {
    // ignore
  }
}

// 执行开门命令
const executeOpenDoor = (commandData) => {
  const startTime = Date.now()
  const duration = commandData.commandParams?.duration || 5 // 默认5秒
  
  // 更新门状态
  currentDoorStatus.value = 'open'
  ElMessage.success(`门已打开，将在${duration}秒后自动关闭`)
  
  // 发送命令接收确认
  sendCommandReceived(commandData.commandLogId)
  
  // 上报状态变化
  sendStatusReport('open', currentControllerStatus.value)
  
  // 设置定时器，时间到后自动关门
  if (doorOpenTimer) {
    clearTimeout(doorOpenTimer)
  }
  doorOpenTimer = setTimeout(() => {
    executeCloseDoor(commandData.commandLogId, startTime)
  }, duration * 1000)
  
  // 立即上报命令执行结果（开门成功）
  setTimeout(() => {
    sendCommandResult(commandData.commandLogId, 'success', {
      message: '门已打开',
      duration: duration
    }, null, Date.now() - startTime)
  }, 100)
}

// 执行关门命令
const executeCloseDoor = (commandLogId, startTime = Date.now()) => {
  // 更新门状态
  currentDoorStatus.value = 'closed'
  ElMessage.info('门已关闭')
  
  // 清除开门定时器
  if (doorOpenTimer) {
    clearTimeout(doorOpenTimer)
    doorOpenTimer = null
  }
  
  // 上报状态变化
  sendStatusReport('closed', currentControllerStatus.value)
  
  // 上报命令执行结果（如果有关门命令）
  if (commandLogId) {
    setTimeout(() => {
      sendCommandResult(commandLogId, 'success', {
        message: '门已关闭'
      }, null, Date.now() - startTime)
    }, 100)
  }
}

// 发送命令接收确认
const sendCommandReceived = (commandLogId) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  const message = {
    type: 'command_received',
    data: {
      commandLogId: commandLogId,
      received: true
    },
    timestamp: Date.now()
  }
  
  ws.send(JSON.stringify(message))
  addWsMessage('send', message)
}

// 发送命令执行结果
const sendCommandResult = (commandLogId, status, responseData, errorMessage, duration) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  const message = {
    type: 'command_result',
    data: {
      commandLogId: commandLogId,
      deviceCode: wsForm.deviceCode,
      status: status,
      responseData: responseData,
      errorMessage: errorMessage,
      duration: duration || 0
    },
    timestamp: Date.now()
  }
  
  ws.send(JSON.stringify(message))
  addWsMessage('send', message)
}

// 处理接收到的命令
const handleCommand = (commandData) => {
  console.log('收到命令:', commandData)
  
  const commandCode = commandData.commandCode
  const commandLogId = commandData.commandLogId
  
  if (commandCode === 'open_door') {
    executeOpenDoor(commandData)
  } else if (commandCode === 'close_door') {
    // 如果当前门是打开的，先关闭定时器
    if (doorOpenTimer) {
      clearTimeout(doorOpenTimer)
      doorOpenTimer = null
    }
    executeCloseDoor(commandLogId)
    sendCommandReceived(commandLogId)
  } else {
    ElMessage.warning(`未知命令: ${commandCode}`)
    // 对于未知命令，仍然发送接收确认和失败结果
    sendCommandReceived(commandLogId)
    sendCommandResult(commandLogId, 'failed', null, `未知命令: ${commandCode}`, 0)
  }
}

// WebSocket连接
const handleConnect = () => {
  if (!wsForm.deviceCode || !wsForm.deviceSecret) {
    ElMessage.warning('请输入设备编码和设备密钥')
    return
  }
  
  wsConnecting.value = true
  try {
    const url = `${wsForm.url}?deviceCode=${encodeURIComponent(wsForm.deviceCode)}&deviceSecret=${encodeURIComponent(wsForm.deviceSecret)}`
    ws = new WebSocket(url)
    
    ws.onopen = () => {
      wsConnected.value = true
      wsConnecting.value = false
      ElMessage.success('WebSocket连接成功')
      addWsMessage('receive', { type: 'connected', message: '连接已建立' })
      // 在连接后，先尝试拉取配置并根据配置启动心跳与状态上报定时器。
      // 使用 finally 保证即使没有配置返回也会启动默认定时器，但先检查定时器是否已被 applyConfigs 启动，避免重复发送。
      fetchAndApplyDeviceConfigs().finally(() => {
        // 如果配置中未启动定时器，则在此处启动（避免重复发送）
        if (!heartbeatIntervalId) {
          startAutoHeartbeat(true)
        } else {
          // 确保定时器以当前 heartbeatIntervalMs 运行（applyConfigs 可能已设置）
          startAutoHeartbeat(false)
        }

        if (!reportIntervalId) {
          // 不在此处立即发送一次（避免与下面的 sendStatusReport 重复）
          startAutoReport(false)
        }

        // 立即更新本地设备在线状态并上报一次状态，确保后端可以广播给所有监控端
        try {
          const nowStr = formatTimestamp(Date.now())
          updateDeviceHeartbeatLocal(wsForm.deviceCode || '', nowStr, 1)
        } catch (e) {
          // ignore
        }
        // 立即发送一次状态上报，触发后端向监控 WebSocket 广播（由后端实现广播逻辑）
        sendStatusReport(currentDoorStatus.value, currentControllerStatus.value)
      })
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // 如果服务端下发配置（中途同步配置），立即应用并按新配置重启定时器
        if (data && (data.type === 'device_config' || data.type === 'config_update' || data.type === 'apply_configs')) {
          const configs = Array.isArray(data.data) ? data.data : (Array.isArray(data.data?.configs) ? data.data.configs : null)
          if (configs && configs.length) {
            applyConfigs(configs)
            // 确保标记为通过配置已应用（applyConfigs 已设置该标志）
          }
        }

        // 如果服务端返回 auth_ack 或 heartbeat_ack，调整自动心跳间隔（除非本地配置已应用）
        if (data.type === 'auth_ack' && data.data && data.data.heartbeatInterval) {
          // 如果本地配置已应用，则优先使用本地配置，忽略服务端的 auth_ack 心跳间隔
          if (!configHeartbeatApplied) {
            heartbeatIntervalMs = data.data.heartbeatInterval * 1000
            // 仅调整定时器，不立即发送一次（避免 ack -> 重启 -> 立即发送 导致循环）
            stopAutoHeartbeat()
            startAutoHeartbeat(false)
          }
        } else if (data.type === 'heartbeat_ack' && data.data && data.data.nextHeartbeatInterval) {
          // heartbeat_ack 同样不应覆盖本地配置（如果已应用）
          if (!configHeartbeatApplied) {
            heartbeatIntervalMs = data.data.nextHeartbeatInterval * 1000
            // 仅调整定时器，不立即发送一次
            stopAutoHeartbeat()
            startAutoHeartbeat(false)
          }
        } else if (data.type === 'command') {
          // 接收到命令，自动执行
          handleCommand(data.data)
        } else if (data.type === 'status_report_ack') {
          // 状态上报确认
          ElMessage.success('状态上报成功')
        } else if (data.type === 'alert_ack') {
          // 告警上报确认
          ElMessage.success('告警已入库')
        }

        addWsMessage('receive', data)
      } catch (e) {
        addWsMessage('receive', { raw: event.data })
      }
    }
    
    ws.onerror = (error) => {
      ElMessage.error('WebSocket连接错误')
      addWsMessage('receive', { type: 'error', error: error.message || '连接错误' })
      wsConnecting.value = false
    }
    
    ws.onclose = () => {
      wsConnected.value = false
      wsConnecting.value = false
      ElMessage.info('WebSocket连接已关闭')
      addWsMessage('receive', { type: 'closed', message: '连接已关闭' })
      // 停止自动心跳
      stopAutoHeartbeat()
      // 清除开门定时器
      if (doorOpenTimer) {
        clearTimeout(doorOpenTimer)
        doorOpenTimer = null
      }
    }
  } catch (error) {
    ElMessage.error('WebSocket连接失败')
    wsConnecting.value = false
  }
}

// 断开WebSocket
const handleDisconnect = () => {
  if (ws) {
    // 停止自动心跳
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId)
      heartbeatIntervalId = null
    }
    // 停止自动上报
    if (reportIntervalId) {
      clearInterval(reportIntervalId)
      reportIntervalId = null
    }
    // 清除开门定时器
    if (doorOpenTimer) {
      clearTimeout(doorOpenTimer)
      doorOpenTimer = null
    }
    ws.close()
    ws = null
  }
}

// 发送心跳
const handleSendHeartbeat = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.warning('WebSocket未连接')
    return
  }
  
  const message = {
    type: 'heartbeat',
    data: {
      deviceCode: wsForm.deviceCode,
      timestamp: Date.now(),
      extraData: {
        version: '1.0.0',
        uptime: 259200
      }
    },
    timestamp: Date.now()
  }
  
  ws.send(JSON.stringify(message))
  addWsMessage('send', message)
  // 本地更新 deviceList，立即反映最后心跳时间和在线状态
  try {
    const timeStr = formatTimestamp(message.data.timestamp)
    updateDeviceHeartbeatLocal(message.data.deviceCode || wsForm.deviceCode, timeStr, 1)
  } catch (e) {
    // ignore
  }
}

// 启动自动心跳
// sendImmediate: 是否立即发送一次心跳（默认 true）。当由服务端 ack 调整间隔时应传 false，避免 ack -> restart -> 立即发送 -> ack 循环。
const startAutoHeartbeat = (sendImmediate = true) => {
  try {
    // 清理已有定时器
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId)
      heartbeatIntervalId = null
    }

    // 立即发送一次（可选）
    if (sendImmediate) {
      handleSendHeartbeat()
    }

    // 启动定时发送
    heartbeatIntervalId = setInterval(() => {
      handleSendHeartbeat()
    }, heartbeatIntervalMs)
  } catch (e) {
    console.error('启动自动心跳失败', e)
  }
}

const stopAutoHeartbeat = () => {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId)
    heartbeatIntervalId = null
  }
}

// 上报状态（内部方法）
const sendStatusReport = (doorStatus, doorControllerStatus) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return
  }
  
  // 更新当前状态
  currentDoorStatus.value = doorStatus
  currentControllerStatus.value = doorControllerStatus
  
  const message = {
    type: 'status_report',
    data: {
      deviceCode: wsForm.deviceCode,
      statusType: 'access',
      doorStatus: doorStatus,
      doorControllerStatus: doorControllerStatus,
      reportTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
    },
    timestamp: Date.now()
  }
  
  ws.send(JSON.stringify(message))
  addWsMessage('send', message)
}

// 手动上报状态
const handleSendStatusReport = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.warning('WebSocket未连接')
    return
  }
  
  sendStatusReport(statusReportForm.doorStatus, statusReportForm.doorControllerStatus)
  ElMessage.success('状态上报已发送')
}

// 发送告警（HTTP POST /alerts）
const handleSendAlert = async () => {
  if (!wsForm.deviceCode) {
    ElMessage.warning('请选择设备编码')
    return
  }
  try {
    const payload = {
      deviceCode: wsForm.deviceCode,
      alertType: alertForm.alertType,
      alertLevel: alertForm.alertLevel,
      alertMessage: alertForm.alertMessage || `${alertForm.alertType} from device ${wsForm.deviceCode}`,
      alertTime: formatTimestamp(Date.now())
    }
    // 优先通过 WebSocket 发送告警（如果连接可用），否则回退到 HTTP 接口
    if (ws && ws.readyState === WebSocket.OPEN) {
      // map alertLevel -> severity per spec
      const severity = payload.alertLevel || 'warning'
      const message = {
        type: 'alert_report',
        data: {
          deviceCode: payload.deviceCode,
          alertType: payload.alertType,
          ruleCode: payload.alertType, // use same as alertType by default
          severity: severity,
          alertMessage: payload.alertMessage,
          alertData: {
            doorStatus: currentDoorStatus.value,
            // duration could be added by device when known
          },
          alertTime: payload.alertTime
        },
        timestamp: Date.now()
      }
      ws.send(JSON.stringify(message))
      addWsMessage('send', message)
      ElMessage.success('通过 WebSocket 发送告警（已发送）')
      alertForm.alertMessage = ''
    } else {
      const res = await sendAlert(payload)
      if (res && res.code === 1) {
        ElMessage.success('告警已通过 HTTP 发送')
        addWsMessage('send', { type: 'alert', data: payload })
        alertForm.alertMessage = ''
      } else {
        ElMessage.error((res && res.msg) || '告警发送失败')
      }
    }
  } catch (error) {
    ElMessage.error('告警发送失败')
    console.error('sendAlert error', error)
  }
}

// 添加WebSocket消息
const addWsMessage = (direction, data) => {
  wsMessages.value.push({
    direction,
    data,
    time: new Date().toLocaleTimeString()
  })
  
  // 保持最多100条消息
  if (wsMessages.value.length > 100) {
    wsMessages.value.shift()
  }
  
  // 自动滚动到底部
  setTimeout(() => {
    const container = document.querySelector('.ws-messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, 100)
}

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
  // 停止自动心跳
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId)
    heartbeatIntervalId = null
  }
  // 清除开门定时器
  if (doorOpenTimer) {
    clearTimeout(doorOpenTimer)
    doorOpenTimer = null
  }
})
</script>

<style scoped>
.device-test {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ws-messages {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  background: #f5f7fa;
}

.message-item {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 4px;
  background: white;
}

.message-item.send {
  border-left: 3px solid #409eff;
}

.message-item.receive {
  border-left: 3px solid #67c23a;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
  color: #909399;
}

.direction {
  font-weight: bold;
}

.message-content {
  margin: 0;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}
</style>

