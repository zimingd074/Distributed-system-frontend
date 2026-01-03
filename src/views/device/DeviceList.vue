<template>
  <div class="device-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备列表</span>
          <el-button type="primary" @click="handleAdd">添加设备</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="设备名称/编码" clearable />
        </el-form-item>
        <el-form-item label="设备分组">
          <el-select v-model="searchForm.groupId" placeholder="全部" clearable style="width: 150px">
            <el-option
              v-for="group in deviceGroups"
              :key="group.id"
              :label="group.groupName"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="门禁类型">
          <el-select v-model="searchForm.deviceType" placeholder="全部" clearable>
            <el-option label="出入口门禁" value="entrance" />
            <el-option label="访客门禁" value="visitor" />
            <el-option label="消防门禁" value="fire" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="故障" value="fault" />
            <el-option label="维护" value="maintain" />
          </el-select>
        </el-form-item>
        <el-form-item label="在线状态">
          <el-select v-model="searchForm.onlineStatus" placeholder="全部" clearable>
            <el-option label="在线" :value="1" />
            <el-option label="离线" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="deviceList" v-loading="loading" style="width: 100%" :row-key="row => row.id">
        <el-table-column prop="deviceCode" label="设备编码" width="150" />
        <el-table-column prop="deviceName" label="设备名称" />
        <el-table-column prop="deviceType" label="门禁类型" width="120">
          <template #default="{ row }">
            {{ getDoorTypeName(row.deviceType) }}
          </template>
        </el-table-column>
        <el-table-column prop="groupName" label="分组" width="120" />
        <el-table-column prop="location" label="门禁位置" />
        <el-table-column prop="status" label="设备状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="onlineStatus" label="在线状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.onlineStatus === 1 ? 'success' : 'danger'" size="small">
              {{ row.onlineStatus === 1 ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="门禁状态" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getDoorStatusType(row.doorStatus)" 
              size="small"
              :effect="row.doorStatus === 'open' ? 'dark' : 'plain'"
            >
              {{ getDoorStatusText(row.doorStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastHeartbeatTime" label="最后心跳" width="180" />
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="primary" link @click="handleConfig(row)">配置</el-button>
            <el-button type="success" link @click="handleDoorControl(row)">门禁控制</el-button>
            <el-button type="info" link @click="handleDoorLog(row)">门禁日志</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        style="margin-top: 20px; justify-content: flex-end;"
      />
    </el-card>

    <!-- 添加/编辑设备对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form ref="deviceFormRef" :model="deviceForm" :rules="deviceRules" label-width="100px">
        <el-form-item label="设备编码" prop="deviceCode">
          <el-input v-model="deviceForm.deviceCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="deviceForm.deviceName" />
        </el-form-item>
        <el-form-item label="门禁类型" prop="deviceType">
          <el-select v-model="deviceForm.deviceType" style="width: 100%">
            <el-option label="出入口门禁" value="entrance" />
            <el-option label="访客门禁" value="visitor" />
            <el-option label="消防门禁" value="fire" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="门禁位置" prop="doorLocation">
          <el-input v-model="deviceForm.doorLocation" placeholder="如：A栋1层东门" />
        </el-form-item>
        <el-form-item label="所属分组" prop="groupId">
          <el-select v-model="deviceForm.groupId" placeholder="请选择分组" clearable style="width: 100%">
            <el-option
              v-for="group in deviceGroups"
              :key="group.id"
              :label="group.groupName"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="IP地址" prop="ipAddress">
          <el-input v-model="deviceForm.ipAddress" />
        </el-form-item>
        <el-form-item label="端口号" prop="port">
          <el-input-number v-model="deviceForm.port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>
        <el-form-item label="MAC地址" prop="macAddress">
          <el-input v-model="deviceForm.macAddress" />
        </el-form-item>
        <el-form-item label="物理位置" prop="location">
          <el-input v-model="deviceForm.location" placeholder="如：机房A-01机柜" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="deviceForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 门禁控制对话框 -->
    <el-dialog
      v-model="doorControlVisible"
      title="门禁控制"
      width="500px"
      @close="currentControlDevice = null"
    >
      <div v-if="currentControlDevice">
        <el-descriptions :column="1" border style="margin-bottom: 20px;">
          <el-descriptions-item label="设备名称">{{ currentControlDevice.deviceName }}</el-descriptions-item>
          <el-descriptions-item label="设备编码">{{ currentControlDevice.deviceCode }}</el-descriptions-item>
          <el-descriptions-item label="当前门禁状态">
            <el-tag :type="getDoorStatusType(deviceStatusMap[currentControlDevice.id]?.doorStatus)" size="small">
              {{ getDoorStatusText(deviceStatusMap[currentControlDevice.id]?.doorStatus) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-form :model="doorControlForm" label-width="120px">
          <el-form-item label="开门持续时间">
            <el-input-number 
              v-model="doorControlForm.duration" 
              :min="1" 
              :max="300" 
              :step="1"
              style="width: 100%"
            />
            <div style="font-size: 12px; color: #909399; margin-top: 5px;">单位：秒（1-300秒）</div>
          </el-form-item>
          <el-form-item>
            <el-button type="success" @click="handleQuickOpenDoor" :loading="doorControlLoading" style="width: 100%;">
              <el-icon><Lock /></el-icon>
              立即开门
            </el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="warning" @click="handleQuickCloseDoor" :loading="doorControlLoading" style="width: 100%;">
              <el-icon><Lock /></el-icon>
              立即关门
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '@/stores/device'
import { getDevices, addDevice, updateDevice, deleteDevice, getDeviceGroups, getDeviceStatus, sendCommand } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import wsManager from '@/utils/websocket'

const router = useRouter()
const deviceStore = useDeviceStore()

const loading = ref(false)
// 使用 store 中的 deviceList 作为单一数据源，确保其它页面也能实时感知变化
const deviceList = computed(() => {
  // 为每个设备添加门禁状态（从实时状态中获取）
  return deviceStore.deviceList.map(device => {
    const status = deviceStatusMap.value[device.id]
    return {
      ...device,
      // 优先使用 deviceStore 中的 doorStatus（由全局 monitor 回调更新），回退到本地 deviceStatusMap
      doorStatus: device.doorStatus || status?.doorStatus || 'closed'
    }
  })
})
const deviceGroups = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加设备')
const isEdit = ref(false)
const submitting = ref(false)
const deviceFormRef = ref(null)
const currentDeviceId = ref(null)
const doorControlVisible = ref(false)
const currentControlDevice = ref(null)
const deviceStatusMap = ref({})
const doorControlForm = reactive({
  duration: 5
})
const doorControlLoading = ref(false)

const searchForm = reactive({
  keyword: '',
  groupId: null,
  deviceType: '',
  status: '',
  onlineStatus: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const deviceForm = reactive({
  deviceCode: '',
  deviceName: '',
  deviceType: '',
  groupId: null,
  ipAddress: '',
  port: 8080,
  macAddress: '',
  location: '',
  doorLocation: '',
  description: ''
})

const deviceRules = {
  deviceCode: [{ required: true, message: '请输入设备编码', trigger: 'blur' }],
  deviceName: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }]
}

const getStatusType = (status) => {
  const map = {
    online: 'success',
    offline: 'danger',
    fault: 'danger',
    maintain: 'warning'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    online: '在线',
    offline: '离线',
    fault: '故障',
    maintain: '维护'
  }
  return map[status] || status
}

const getDoorTypeName = (type) => {
  const map = {
    entrance: '出入口门禁',
    visitor: '访客门禁',
    fire: '消防门禁',
    other: '其他',
    server: '服务器',
    controller: '控制器'
  }
  return map[type] || type
}

const getDoorStatusType = (doorStatus) => {
  if (doorStatus === 'open') return 'warning'
  if (doorStatus === 'closed') return 'success'
  return 'info'
}

const getDoorStatusText = (doorStatus) => {
  if (doorStatus === 'open') return '开启'
  if (doorStatus === 'closed') return '关闭'
  return '未知'
}

const loadDevices = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getDevices(params)
    if (res.code === 1) {
      // 写入 store，保持单一数据源
      deviceStore.deviceList = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取设备列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadDevices()
}

const loadDeviceGroups = async () => {
  try {
    const res = await getDeviceGroups()
    if (res.code === 1) {
      deviceGroups.value = res.data || []
    }
  } catch (error) {
    console.error('获取设备分组失败:', error)
  }
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    groupId: null,
    deviceType: '',
    status: '',
    onlineStatus: null
  })
  handleSearch()
}

const handleAdd = () => {
  dialogTitle.value = '添加设备'
  isEdit.value = false
  currentDeviceId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleView = (row) => {
  router.push(`/devices/${row.id}`)
}

const handleConfig = (row) => {
  router.push(`/devices/${row.id}/config`)
}

const handleStatus = (row) => {
  router.push(`/devices/${row.id}/status`)
}

const handleDoorControl = (row) => {
  // 打开门禁控制面板
  doorControlVisible.value = true
  currentControlDevice.value = row
}

const handleDoorLog = (row) => {
  // 跳转到门禁日志页面（使用命令历史页面）
  router.push(`/commands?deviceId=${row.id}`)
}

const handleQuickOpenDoor = async () => {
  if (!currentControlDevice.value) return
  
  // 检查设备是否在线（WebSocket连接）
  if (currentControlDevice.value.onlineStatus !== 1) {
    ElMessage.error('设备未在线，无法发送命令。请确保设备已通过WebSocket连接到服务器。')
    return
  }
  
  doorControlLoading.value = true
  try {
    const res = await sendCommand(currentControlDevice.value.id, {
      commandCode: 'open_door',
      commandParams: {
        duration: doorControlForm.duration
      }
    })
    if (res.code === 1) {
      ElMessage.success('开门命令已发送')
      doorControlVisible.value = false
    }
  } catch (error) {
    ElMessage.error('开门命令发送失败')
  } finally {
    doorControlLoading.value = false
  }
}

const handleQuickCloseDoor = async () => {
  if (!currentControlDevice.value) return
  
  // 检查设备是否在线（WebSocket连接）
  if (currentControlDevice.value.onlineStatus !== 1) {
    ElMessage.error('设备未在线，无法发送命令。请确保设备已通过WebSocket连接到服务器。')
    return
  }
  
  doorControlLoading.value = true
  try {
    const res = await sendCommand(currentControlDevice.value.id, {
      commandCode: 'close_door',
      commandParams: {}
    })
    if (res.code === 1) {
      ElMessage.success('关门命令已发送')
      doorControlVisible.value = false
    }
  } catch (error) {
    ElMessage.error('关门命令发送失败')
  } finally {
    doorControlLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除设备 "${row.deviceName}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await deleteDevice(row.id)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      loadDevices()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const resetForm = () => {
  Object.assign(deviceForm, {
    deviceCode: '',
    deviceName: '',
    deviceType: '',
    groupId: null,
    ipAddress: '',
    port: 8080,
    macAddress: '',
    location: '',
    doorLocation: '',
    description: ''
  })
  if (deviceFormRef.value) {
    deviceFormRef.value.clearValidate()
  }
}

const handleDialogClose = () => {
  resetForm()
}

const handleSubmit = async () => {
  if (!deviceFormRef.value) return
  
  await deviceFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let res
        if (isEdit.value) {
          res = await updateDevice(currentDeviceId.value, deviceForm)
        } else {
          res = await addDevice(deviceForm)
        }
        
        if (res.code === 1) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          
          // 如果是添加设备，显示设备密钥（deviceSecret）
          if (!isEdit.value && res.data && res.data.deviceSecret) {
            ElMessageBox.alert(
              `<div style="margin: 10px 0;">
                <p><strong>设备编码：</strong>${res.data.deviceCode}</p>
                <p><strong>设备密钥：</strong></p>
                <p style="background: #f5f7fa; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace;">${res.data.deviceSecret}</p>
                <p style="color: #f56c6c; margin-top: 10px;"><strong>⚠️ 重要提示：设备密钥仅在创建时返回一次，请立即保存！</strong></p>
              </div>`,
              '设备添加成功',
              {
                dangerouslyUseHTMLString: true,
                confirmButtonText: '已保存',
                type: 'success'
              }
            )
          }
          
          dialogVisible.value = false
          loadDevices()
        }
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleSizeChange = () => {
  loadDevices()
}

const handlePageChange = () => {
  loadDevices()
}

onMounted(async () => {
  await loadDeviceGroups()
  await loadDevices()
  await loadDeviceDoorStatus()
  
  // 监听后端的监控消息（心跳/状态上报），实时更新设备列表中的最后心跳时间
  wsManager.onMonitorMessage(handleMonitorMessage)
  // 如果尚未由 auth 建立监控连接，尝试使用本地 token 建立，保证能够接收监控消息
  try {
    const token = localStorage.getItem('accessToken')
    if (token) {
      wsManager.connectMonitor(token, {
        onMessage: (m) => {
          // 额外日志，方便排查消息是否到达
          // console.log('monitor onMessage (connectMonitor callback):', m)
        }
      })
    }
  } catch (e) {
    // ignore
  }
})

onUnmounted(() => {
  wsManager.offMonitorMessage(handleMonitorMessage)
})

// 加载设备门禁状态
const loadDeviceDoorStatus = async () => {
  if (!Array.isArray(deviceStore.deviceList)) return
  
  // 并行加载所有设备的门禁状态
  const statusPromises = deviceStore.deviceList.map(async (device) => {
    try {
      const res = await getDeviceStatus(device.id)
      if (res.code === 1) {
        deviceStatusMap.value[device.id] = res.data
      }
    } catch (e) {
      // 忽略单个设备状态加载失败
    }
  })
  
  await Promise.all(statusPromises)
}

// 时间格式转换函数：将时间戳或 ISO 字符串转换为 "YYYY-MM-DD HH:mm:ss" 格式
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

// 处理监控消息，更新 deviceList 的 lastHeartbeatTime / onlineStatus / doorStatus
const handleMonitorMessage = (message) => {
  if (!message) return

  // 兼容不同消息类型：device_status_update / heartbeat / device_status_change
  const payload = message.data || message
  const deviceId = payload.deviceId || payload.id || payload.device_id
  const deviceCode = payload.deviceCode || payload.device_code
  const heartbeatTime = payload.lastHeartbeatTime || payload.reportTime || payload.heartbeatTime || payload.report_time

  // 只要有 deviceId 或 deviceCode 就处理（即使没有心跳时间，也可能有门禁状态更新）
  if (!deviceId && !deviceCode) return

  // 更新 store 中的 deviceList，保持单一数据源
  if (!Array.isArray(deviceStore.deviceList)) return
  const idx = deviceStore.deviceList.findIndex(d => (deviceId && d.id === Number(deviceId)) || (deviceCode && String(d.deviceCode) === String(deviceCode)))
  if (idx > -1) {
    const updated = { ...deviceStore.deviceList[idx] }
    // 时间格式转换
    if (heartbeatTime) {
      updated.lastHeartbeatTime = formatTimestamp(heartbeatTime) || heartbeatTime
    }
    if (typeof payload.onlineStatus !== 'undefined') updated.onlineStatus = payload.onlineStatus
    // 门禁状态更新（后端会广播 doorStatus）
    if (typeof payload.doorStatus !== 'undefined') {
      updated.doorStatus = payload.doorStatus
    }
    if (typeof payload.doorControllerStatus !== 'undefined') {
      updated.doorControllerStatus = payload.doorControllerStatus
    }
    if (payload.status) updated.status = payload.status
    // 原子替换保证响应式
    deviceStore.deviceList.splice(idx, 1, updated)
  }
  
  // 同时更新本地 deviceStatusMap（用于门禁状态显示）
  if (deviceId && (typeof payload.doorStatus !== 'undefined' || typeof payload.doorControllerStatus !== 'undefined')) {
    if (!deviceStatusMap.value[deviceId]) {
      deviceStatusMap.value[deviceId] = {}
    }
    deviceStatusMap.value[deviceId] = {
      ...deviceStatusMap.value[deviceId],
      doorStatus: payload.doorStatus !== undefined ? payload.doorStatus : deviceStatusMap.value[deviceId].doorStatus,
      doorControllerStatus: payload.doorControllerStatus !== undefined ? payload.doorControllerStatus : deviceStatusMap.value[deviceId].doorControllerStatus,
      reportTime: payload.reportTime ? formatTimestamp(payload.reportTime) : deviceStatusMap.value[deviceId].reportTime
    }
  }
}
</script>

<style scoped>
.device-list {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}
</style>

