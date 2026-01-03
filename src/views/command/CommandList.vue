<template>
  <div class="command-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>门禁控制</span>
          <div>
            <el-button type="danger" @click="handleEmergencyOpen" :loading="emergencyLoading">
              <el-icon><Warning /></el-icon>
              紧急开门
            </el-button>
            <el-button type="primary" @click="handleSendCommand">发送命令</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="单设备控制" name="send">
          <el-form :model="commandForm" label-width="120px" style="max-width: 600px;">
            <el-form-item label="选择门禁设备" required>
              <el-select
                v-model="commandForm.deviceId"
                placeholder="请选择门禁设备"
                filterable
                style="width: 100%"
                @change="handleDeviceChange"
              >
                <el-option
                  v-for="device in deviceList"
                  :key="device.id"
                  :label="`${device.deviceName} (${device.deviceCode})`"
                  :value="device.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="选择命令" required>
              <el-select
                v-model="commandForm.commandCode"
                placeholder="请选择命令"
                style="width: 100%"
                @change="handleCommandChange"
              >
                <el-option label="开门" value="open_door" />
                <el-option label="关门" value="close_door" />
                <el-option
                  v-for="cmd in filteredCommands"
                  :key="cmd.commandCode"
                  :label="cmd.commandName"
                  :value="cmd.commandCode"
                />
              </el-select>
            </el-form-item>
            <el-form-item 
              label="开门持续时间" 
              v-if="commandForm.commandCode === 'open_door'"
            >
              <el-input-number 
                v-model="commandForm.duration" 
                :min="1" 
                :max="300" 
                :step="1"
                style="width: 100%"
              />
              <div style="font-size: 12px; color: #909399; margin-top: 5px;">单位：秒（默认5秒）</div>
            </el-form-item>
            <el-form-item 
              label="关门方式" 
              v-if="commandForm.commandCode === 'close_door'"
            >
              <el-radio-group v-model="commandForm.closeMode">
                <el-radio label="immediate">立即关闭</el-radio>
                <el-radio label="scheduled">定时关闭</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item 
              label="定时关闭时间" 
              v-if="commandForm.commandCode === 'close_door' && commandForm.closeMode === 'scheduled'"
            >
              <el-time-picker
                v-model="commandForm.scheduledTime"
                placeholder="选择关闭时间"
                format="HH:mm:ss"
                value-format="HH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="命令参数" v-if="selectedCommand && selectedCommand.paramSchema && commandForm.commandCode !== 'open_door' && commandForm.commandCode !== 'close_door'">
              <el-input
                v-model="commandForm.commandParams"
                type="textarea"
                :rows="5"
                placeholder='请输入JSON格式参数，例如: {"delay": 10}'
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSubmit" :loading="submitting">发送命令</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="批量控制" name="batch">
          <el-form :model="batchForm" label-width="120px" style="max-width: 600px;">
            <el-form-item label="选择门禁设备" required>
              <el-select
                v-model="batchForm.deviceIds"
                placeholder="请选择多个门禁设备"
                filterable
                multiple
                style="width: 100%"
              >
                <el-option
                  v-for="device in deviceList"
                  :key="device.id"
                  :label="`${device.deviceName} (${device.deviceCode})`"
                  :value="device.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="批量操作" required>
              <el-radio-group v-model="batchForm.operation">
                <el-radio label="open">批量开门</el-radio>
                <el-radio label="close">批量关门</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item 
              label="开门持续时间" 
              v-if="batchForm.operation === 'open'"
            >
              <el-input-number 
                v-model="batchForm.duration" 
                :min="1" 
                :max="300" 
                :step="1"
                style="width: 100%"
              />
              <div style="font-size: 12px; color: #909399; margin-top: 5px;">单位：秒（默认5秒）</div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleBatchSubmit" :loading="batchSubmitting">批量执行</el-button>
              <el-button @click="resetBatchForm">重置</el-button>
            </el-form-item>
          </el-form>
          
          <el-card v-if="batchResults.length > 0" style="margin-top: 20px;">
            <template #header>
              <span>批量执行结果</span>
            </template>
            <el-table :data="batchResults" style="width: 100%">
              <el-table-column prop="deviceName" label="设备名称" />
              <el-table-column prop="status" label="执行状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                    {{ row.status === 'success' ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="responseTime" label="响应时间" width="120">
                <template #default="{ row }">
                  {{ row.responseTime ? row.responseTime + 'ms' : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="message" label="消息" />
            </el-table>
          </el-card>
        </el-tab-pane>
        
        <el-tab-pane label="命令历史" name="history">
          <el-form :inline="true" :model="searchForm" style="margin-bottom: 20px;">
            <el-form-item label="设备">
              <el-select v-model="searchForm.deviceId" placeholder="请选择设备" clearable style="width: 200px">
                <el-option
                  v-for="device in deviceList"
                  :key="device.id"
                  :label="device.deviceName"
                  :value="device.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearchHistory">查询</el-button>
              <el-button @click="handleResetHistory">重置</el-button>
            </el-form-item>
          </el-form>
          
          <el-table :data="historyList" v-loading="historyLoading" style="width: 100%">
            <el-table-column prop="deviceName" label="设备名称" />
            <el-table-column prop="commandCode" label="命令编码" />
            <el-table-column prop="commandName" label="命令名称" />
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="executeTime" label="执行时间" width="180" />
            <el-table-column prop="responseTime" label="响应时间" width="180" />
            <el-table-column prop="duration" label="执行耗时" width="120">
              <template #default="{ row }">
                {{ row.duration ? row.duration + 'ms' : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link @click="handleViewDetail(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="searchForm.deviceId"
            v-model:current-page="historyPagination.page"
            v-model:page-size="historyPagination.pageSize"
            :total="historyPagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleHistorySizeChange"
            @current-change="handleHistoryPageChange"
            style="margin-top: 20px; justify-content: flex-end;"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 命令详情对话框 -->
    <el-dialog v-model="detailVisible" title="命令执行详情" width="800px">
      <el-descriptions :column="2" border v-if="commandDetail">
        <el-descriptions-item label="设备名称">{{ commandDetail.deviceName }}</el-descriptions-item>
        <el-descriptions-item label="命令编码">{{ commandDetail.commandCode }}</el-descriptions-item>
        <el-descriptions-item label="命令名称">{{ commandDetail.commandName }}</el-descriptions-item>
        <el-descriptions-item label="执行状态">
          <el-tag :type="getStatusType(commandDetail.status)">{{ getStatusText(commandDetail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="执行用户">{{ commandDetail.executeUser || '-' }}</el-descriptions-item>
        <el-descriptions-item label="执行时间">{{ commandDetail.executeTime }}</el-descriptions-item>
        <el-descriptions-item label="响应时间">{{ commandDetail.responseTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="执行耗时">{{ commandDetail.duration ? commandDetail.duration + 'ms' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="命令参数" :span="2">
          <pre>{{ JSON.stringify(commandDetail.commandParams || {}, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="响应数据" :span="2" v-if="commandDetail.responseData">
          <pre>{{ JSON.stringify(commandDetail.responseData, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="commandDetail.errorMessage">
          <el-alert :title="commandDetail.errorMessage" type="error" />
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { getCommands, sendCommand, getCommandLog, getCommandHistory } from '@/api'
import { getDevices } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import wsManager from '@/utils/websocket'

const activeTab = ref('send')
const commandList = ref([])
const filteredCommands = computed(() => {
  try {
    return (commandList.value || []).filter(cmd => cmd && typeof cmd.commandCode !== 'undefined' && cmd.commandCode !== 'open_door' && cmd.commandCode !== 'close_door')
  } catch (e) {
    return []
  }
})
const deviceList = ref([])
const historyList = ref([])
const historyLoading = ref(false)
const submitting = ref(false)
const detailVisible = ref(false)
const commandDetail = ref(null)
const selectedCommand = ref(null)

const commandForm = reactive({
  deviceId: null,
  commandCode: '',
  commandParams: '',
  duration: 5,
  closeMode: 'immediate',
  scheduledTime: ''
})

const batchForm = reactive({
  deviceIds: [],
  operation: 'open',
  duration: 5
})

const batchResults = ref([])
const batchSubmitting = ref(false)
const emergencyLoading = ref(false)

const searchForm = reactive({
  deviceId: null
})

const historyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const getStatusType = (status) => {
  const map = {
    success: 'success',
    failed: 'danger',
    sending: 'warning',
    pending: 'info',
    timeout: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    success: '成功',
    failed: '失败',
    sending: '发送中',
    pending: '待执行',
    timeout: '超时'
  }
  return map[status] || status
}

const loadCommands = async () => {
  try {
    const res = await getCommands()
    if (res.code === 1) {
      commandList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取命令列表失败')
  }
}

const loadDevices = async () => {
  try {
    const res = await getDevices({ page: 1, pageSize: 1000 })
    if (res.code === 1) {
      deviceList.value = res.data.rows || []
    }
  } catch (error) {
    ElMessage.error('获取设备列表失败')
  }
}

const handleDeviceChange = () => {
  // 可以加载该设备的命令历史
}

const handleCommandChange = () => {
  selectedCommand.value = commandList.value.find(cmd => cmd.commandCode === commandForm.commandCode)
}

const handleSendCommand = () => {
  activeTab.value = 'send'
}

const resetForm = () => {
  Object.assign(commandForm, {
    deviceId: null,
    commandCode: '',
    commandParams: '',
    duration: 5,
    closeMode: 'immediate',
    scheduledTime: ''
  })
  selectedCommand.value = null
}

const resetBatchForm = () => {
  Object.assign(batchForm, {
    deviceIds: [],
    operation: 'open',
    duration: 5
  })
  batchResults.value = []
}

const handleSubmit = async () => {
  if (!commandForm.deviceId) {
    ElMessage.warning('请选择门禁设备')
    return
  }
  if (!commandForm.commandCode) {
    ElMessage.warning('请选择命令')
    return
  }
  
  // 检查监控WebSocket是否连接
  if (!wsManager.isMonitorConnected()) {
    ElMessage.error('监控WebSocket未连接，无法发送命令。请确保已连接到服务器。')
    return
  }
  
  // 检查设备是否在线（WebSocket连接）
  const selectedDevice = deviceList.value.find(d => d.id === commandForm.deviceId)
  if (!selectedDevice) {
    ElMessage.error('未找到选中的设备')
    return
  }
  if (selectedDevice.onlineStatus !== 1) {
    ElMessage.error(`设备"${selectedDevice.deviceName}"未在线，无法发送命令。请确保设备已通过WebSocket连接到服务器。`)
    return
  }
  
  submitting.value = true
  try {
    const data = {
      commandCode: commandForm.commandCode
    }
    
    // 处理开门命令参数
    if (commandForm.commandCode === 'open_door') {
      data.commandParams = {
        duration: commandForm.duration || 5
      }
    }
    // 处理关门命令参数
    else if (commandForm.commandCode === 'close_door') {
      if (commandForm.closeMode === 'scheduled' && commandForm.scheduledTime) {
        data.commandParams = {
          scheduledTime: commandForm.scheduledTime
        }
      } else {
        data.commandParams = {}
      }
    }
    // 其他命令的参数处理
    else if (commandForm.commandParams) {
      try {
        data.commandParams = JSON.parse(commandForm.commandParams)
      } catch (e) {
        ElMessage.error('命令参数格式错误，请输入有效的JSON')
        submitting.value = false
        return
      }
    }
    
    const startTime = Date.now()
    const res = await sendCommand(commandForm.deviceId, data)
    const responseTime = Date.now() - startTime
    
    if (res.code === 1) {
      ElMessage.success(`命令发送成功，响应时间：${responseTime}ms`)
      resetForm()
      activeTab.value = 'history'
      loadHistory()
    }
  } catch (error) {
    ElMessage.error('命令发送失败')
  } finally {
    submitting.value = false
  }
}

const handleBatchSubmit = async () => {
  if (!batchForm.deviceIds || batchForm.deviceIds.length === 0) {
    ElMessage.warning('请选择至少一个门禁设备')
    return
  }
  
  // 检查监控WebSocket是否连接
  if (!wsManager.isMonitorConnected()) {
    ElMessage.error('监控WebSocket未连接，无法发送命令。请确保已连接到服务器。')
    return
  }
  
  // 检查所有选中的设备是否在线
  const offlineDevices = []
  batchForm.deviceIds.forEach(deviceId => {
    const device = deviceList.value.find(d => d.id === deviceId)
    if (device && device.onlineStatus !== 1) {
      offlineDevices.push(device.deviceName || `设备${deviceId}`)
    }
  })
  
  if (offlineDevices.length > 0) {
    ElMessage.error(`以下设备未在线，无法发送命令：${offlineDevices.join('、')}。请确保设备已通过WebSocket连接到服务器。`)
    return
  }
  
  batchSubmitting.value = true
  batchResults.value = []
  
  try {
    const commandCode = batchForm.operation === 'open' ? 'open_door' : 'close_door'
    const commandParams = batchForm.operation === 'open' 
      ? { duration: batchForm.duration || 5 }
      : {}
    
    // 并行执行批量命令
    const promises = batchForm.deviceIds.map(async (deviceId) => {
      const device = deviceList.value.find(d => d.id === deviceId)
      const startTime = Date.now()
      try {
        const res = await sendCommand(deviceId, {
          commandCode,
          commandParams
        })
        const responseTime = Date.now() - startTime
        
        return {
          deviceName: device?.deviceName || `设备${deviceId}`,
          status: res.code === 1 ? 'success' : 'failed',
          responseTime,
          message: res.code === 1 ? '执行成功' : (res.msg || '执行失败')
        }
      } catch (error) {
        return {
          deviceName: device?.deviceName || `设备${deviceId}`,
          status: 'failed',
          responseTime: Date.now() - startTime,
          message: error.message || '执行失败'
        }
      }
    })
    
    const results = await Promise.all(promises)
    batchResults.value = results
    
    const successCount = results.filter(r => r.status === 'success').length
    ElMessage.success(`批量执行完成：成功 ${successCount}/${results.length}`)
  } catch (error) {
    ElMessage.error('批量执行失败')
  } finally {
    batchSubmitting.value = false
  }
}

const handleEmergencyOpen = async () => {
  try {
    // 检查监控WebSocket是否连接
    if (!wsManager.isMonitorConnected()) {
      ElMessage.error('监控WebSocket未连接，无法发送紧急开门命令。请确保已连接到服务器。')
      return
    }
    
    await ElMessageBox.confirm(
      '紧急开门将打开所有在线门禁设备，持续时间为10秒。确定要继续吗？',
      '紧急开门确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    
    emergencyLoading.value = true
    
    // 获取所有在线设备
    const res = await getDevices({ page: 1, pageSize: 1000, onlineStatus: 1 })
    if (res.code === 1) {
      const onlineDevices = res.data.rows || []
      
      if (onlineDevices.length === 0) {
        ElMessage.warning('没有在线的门禁设备')
        emergencyLoading.value = false
        return
      }
      
      // 批量开门
      const promises = onlineDevices.map(device => 
        sendCommand(device.id, {
          commandCode: 'open_door',
          commandParams: { duration: 10 }
        }).catch(() => null)
      )
      
      await Promise.all(promises)
      ElMessage.success(`紧急开门命令已发送到 ${onlineDevices.length} 个设备`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('紧急开门失败')
    }
  } finally {
    emergencyLoading.value = false
  }
}

const loadHistory = async () => {
  if (!searchForm.deviceId) {
    historyList.value = []
    historyPagination.total = 0
    return
  }
  
  historyLoading.value = true
  try {
    const res = await getCommandHistory(searchForm.deviceId, {
      page: historyPagination.page,
      pageSize: historyPagination.pageSize
    })
    if (res.code === 1) {
      historyList.value = res.data.rows || []
      historyPagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取命令历史失败')
  } finally {
    historyLoading.value = false
  }
}

const handleSearchHistory = () => {
  historyPagination.page = 1
  loadHistory()
}

const handleResetHistory = () => {
  searchForm.deviceId = null
  historyPagination.page = 1
  historyPagination.total = 0
  historyList.value = []
}

const handleHistorySizeChange = () => {
  loadHistory()
}

const handleHistoryPageChange = () => {
  loadHistory()
}

const handleViewDetail = async (row) => {
  try {
    const res = await getCommandLog(row.commandLogId)
    if (res.code === 1) {
      commandDetail.value = res.data
      detailVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取命令详情失败')
  }
}

onMounted(() => {
  loadCommands()
  loadDevices()
})
</script>

<style scoped>
.command-list {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

pre {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>

