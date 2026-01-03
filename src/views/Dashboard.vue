<template>
  <div class="dashboard">
    <!-- 门禁状态统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409EFF;">
              <el-icon size="30"><Lock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ doorStatistics.totalCount || 0 }}</div>
              <div class="stat-label">门禁总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67C23A;">
              <el-icon size="30"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ doorStatistics.closedCount || 0 }}</div>
              <div class="stat-label">已关门数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #E6A23C;">
              <el-icon size="30"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ doorStatistics.openCount || 0 }}</div>
              <div class="stat-label">已开门数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #F56C6C;">
              <el-icon size="30"><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ doorStatistics.abnormalCount || 0 }}</div>
              <div class="stat-label">异常状态数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 门禁状态分布 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>门禁状态分布</span>
            </div>
          </template>
          <div ref="doorStatusChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      <!-- 门禁状态实时趋势图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>门禁状态实时趋势（过去24小时）</span>
            </div>
          </template>
          <div ref="trendChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <!-- 门禁操作记录 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>门禁操作记录</span>
              <el-button type="text" @click="$router.push('/commands')">查看更多</el-button>
            </div>
          </template>
          <el-table :data="recentOperations" style="width: 100%" :show-header="true">
            <el-table-column prop="deviceName" label="门禁设备" width="150" />
            <el-table-column prop="operation" label="操作" width="100">
              <template #default="{ row }">
                <el-tag :type="row.operation === '开门' ? 'warning' : 'success'" size="small">
                  {{ row.operation }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="time" label="时间" width="180" />
          </el-table>
        </el-card>
      </el-col>
      <!-- 门禁告警摘要 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>门禁告警摘要</span>
              <el-button type="text" @click="$router.push('/alerts')">查看更多</el-button>
            </div>
          </template>
          <div class="alert-summary">
            <div 
              v-for="alert in doorAlerts" 
              :key="alert.alertId"
              class="alert-item"
              :class="getAlertItemClass(alert.alertLevel)"
            >
              <div class="alert-icon">
                <el-icon v-if="alert.alertType === 'door_not_closed_timeout'"><Clock /></el-icon>
                <el-icon v-else-if="alert.alertType === 'illegal_open'"><Warning /></el-icon>
                <el-icon v-else><Bell /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-title">{{ getAlertTypeName(alert.alertType) }}</div>
                <div class="alert-desc">{{ alert.deviceName }}</div>
                <div class="alert-time">{{ alert.alertTime }}</div>
              </div>
              <div class="alert-status">
                <el-tag :type="getStatusType(alert.status)" size="small">
                  {{ getStatusText(alert.status) }}
                </el-tag>
              </div>
            </div>
            <div v-if="doorAlerts.length === 0" class="no-alerts">
              <el-empty description="暂无门禁告警" :image-size="80" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { useDeviceStore } from '@/stores/device'
import { useAlertStore } from '@/stores/alert'
import { getAlerts, getAlertStatistics, getDevices, getCommandHistory, getDeviceStatus, getDeviceStatusHistory, getAllDeviceStatusHistory } from '@/api'
import wsManager from '@/utils/websocket'
import { Lock, CircleCheck, Warning, Bell, Clock } from '@element-plus/icons-vue'

const deviceStore = useDeviceStore()
const alertStore = useAlertStore()

const statistics = ref({})
const alertStats = ref({})
const doorStatistics = ref({
  totalCount: 0,
  openCount: 0,
  closedCount: 0,
  abnormalCount: 0
})
const recentOperations = ref([])
const doorAlerts = ref([])
const doorStatusChartRef = ref(null)
const trendChartRef = ref(null)
let doorStatusChart = null
let trendChart = null

const getAlertLevelType = (level) => {
  const map = {
    critical: 'danger',
    error: 'danger',
    warning: 'warning',
    info: 'info'
  }
  return map[level] || 'info'
}

const getStatusType = (status) => {
  const map = {
    pending: 'warning',
    confirmed: 'info',
    resolved: 'success',
    ignored: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    pending: '待处理',
    confirmed: '已确认',
    resolved: '已解决',
    ignored: '已忽略'
  }
  return map[status] || status
}

const getAlertTypeName = (alertType) => {
  const map = {
    door_not_closed_timeout: '门未关超时',
    illegal_open: '非法开启',
    door_controller_fault: '门禁控制器故障',
    device_offline: '设备离线'
  }
  return map[alertType] || alertType
}

const getAlertItemClass = (level) => {
  const map = {
    critical: 'alert-critical',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info'
  }
  return map[level] || ''
}

const loadStatistics = async () => {
  const res = await deviceStore.fetchStatistics()
  if (res.success) {
    statistics.value = deviceStore.deviceStatistics || {}
  }
  
  // 加载门禁设备列表，统计门禁状态
  await loadDoorStatistics()
}

const loadDoorStatistics = async () => {
  try {
    const res = await getDevices({ page: 1, pageSize: 1000 })
    if (res.code === 1) {
      const devices = res.data.rows || []
      doorStatistics.value.totalCount = devices.length
      
      // 统计门禁状态（从设备详情中获取doorStatus）
      let openCount = 0
      let closedCount = 0
      let abnormalCount = 0
      
      // 并行获取设备状态
      const statusPromises = devices.slice(0, 50).map(device => 
        getDeviceStatus(device.id).catch(() => null)
      )
      const statusResults = await Promise.all(statusPromises)
      
      statusResults.forEach((statusRes, index) => {
        if (statusRes && statusRes.code === 1) {
          const status = statusRes.data
          if (status.doorStatus === 'open') {
            openCount++
          } else if (status.doorStatus === 'closed') {
            closedCount++
          } else {
            abnormalCount++
          }
        }
      })
      
      // 对于未获取到状态的设备，假设为关闭状态
      closedCount += devices.length - statusResults.length
      
      doorStatistics.value.openCount = openCount
      doorStatistics.value.closedCount = closedCount
      doorStatistics.value.abnormalCount = abnormalCount
    }
  } catch (error) {
    console.error('加载门禁统计失败:', error)
  }
}

const loadAlertStats = async () => {
  const res = await getAlertStatistics()
  if (res.code === 1) {
    alertStats.value = res.data || {}
  }
}

const loadDoorAlerts = async () => {
  // 加载门禁相关告警
  const res = await getAlerts({ 
    page: 1, 
    pageSize: 5,
    alertType: 'door_not_closed_timeout,illegal_open,door_controller_fault'
  })
  if (res.code === 1) {
    doorAlerts.value = res.data.rows || []
  }
}

const loadRecentOperations = async () => {
  // 使用批量接口获取当天的门禁状态历史记录（5.2.5接口）
  try {
    // 计算当天的开始时间（00:00:00）和结束时间（当前时间）
    const now = new Date()
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
    
    // 当天开始时间：00:00:00
    const startTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 00:00:00`
    
    // 当前时间
    const endTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    
    // 调用批量接口获取当天的门禁状态历史
    const statusHistRes = await getAllDeviceStatusHistory({
      startTime,
      endTime,
      statusType: 'access', // 筛选门禁状态类型
      sort: 'reportTime_desc', // 按时间倒序
      page: 1,
      pageSize: 100 // 获取足够多的记录，然后筛选出最新的门状态变化
    })
    
    if (statusHistRes && statusHistRes.code === 1 && statusHistRes.data && statusHistRes.data.rows) {
      const rows = statusHistRes.data.rows || []
      const operations = []
      
      // 筛选出有门状态变化的记录，并转换为操作记录格式
      for (const record of rows) {
        if (record.doorStatus && (record.doorStatus === 'open' || record.doorStatus === 'closed')) {
          operations.push({
            deviceName: record.deviceName || record.deviceCode || '未知设备',
            operation: record.doorStatus === 'open' ? '开门' : '关门',
            time: record.reportTime || record.report_time || record.createdAt
          })
          
          // 只取前5条
          if (operations.length >= 5) {
            break
          }
        }
      }
      
      recentOperations.value = operations
      
      // 如果批量接口没有返回足够的记录，回退到命令历史作为补充
      if (operations.length < 5) {
        try {
          const devicesRes = await getDevices({ page: 1, pageSize: 10 })
          if (devicesRes.code === 1) {
            const devices = devicesRes.data.rows || []
            const existingDeviceNames = new Set(operations.map(op => op.deviceName))
            
            for (const device of devices) {
              if (operations.length >= 5) break
              if (existingDeviceNames.has(device.deviceName)) continue
              if (!device || (typeof device.id === 'undefined' || device.id === null)) continue
              
              try {
                const cmdHistRes = await getCommandHistory(device.id, { page: 1, pageSize: 1 })
                if (cmdHistRes && cmdHistRes.code === 1 && cmdHistRes.data.rows && cmdHistRes.data.rows.length > 0) {
                  const cmd = cmdHistRes.data.rows[0]
                  if (cmd && (cmd.commandCode === 'open_door' || cmd.commandCode === 'close_door')) {
                    operations.push({
                      deviceName: device.deviceName,
                      operation: cmd.commandCode === 'open_door' ? '开门' : '关门',
                      time: cmd.executeTime
                    })
                    existingDeviceNames.add(device.deviceName)
                  }
                }
              } catch (err) {
                // 忽略单个设备查询失败
                console.warn(`获取设备 ${device.id} 命令历史失败:`, err)
              }
            }
            
            recentOperations.value = operations.slice(0, 5)
          }
        } catch (err) {
          console.warn('回退到命令历史失败:', err)
        }
      }
    } else {
      // 如果批量接口失败，回退到原来的逻辑
      console.warn('批量获取状态历史失败，回退到逐个设备查询')
      recentOperations.value = []
    }
  } catch (error) {
    console.error('加载操作记录失败:', error)
    recentOperations.value = []
  }
}

const initDoorStatusChart = () => {
  if (!doorStatusChartRef.value) return
  doorStatusChart = echarts.init(doorStatusChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['已开门', '已关门']
    },
    color: ['#E6A23C', '#67C23A'],
    series: [
      {
        name: '门禁状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: [
          { value: doorStatistics.value.openCount || 0, name: '已开门' },
          { value: doorStatistics.value.closedCount || 0, name: '已关门' }
        ]
      }
    ]
  }
  
  doorStatusChart.setOption(option)
}

// 加载趋势图数据（过去24小时的门禁状态历史）
const loadTrendChartData = async () => {
  try {
    // 计算过去24小时的开始时间和结束时间
    const now = new Date()
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
    
    // 24小时前的时间
    const startTime = (() => {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })()
    
    // 当前时间
    const endTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    
    // 调用批量接口获取过去24小时的门禁状态历史
    const statusHistRes = await getAllDeviceStatusHistory({
      startTime,
      endTime,
      statusType: 'access', // 筛选门禁状态类型
      sort: 'reportTime_asc', // 按时间正序
      page: 1,
      pageSize: 1000 // 获取足够多的记录
    })
    
    if (statusHistRes && statusHistRes.code === 1 && statusHistRes.data && statusHistRes.data.rows) {
      const rows = statusHistRes.data.rows || []
      
      // 生成过去24小时的时间点（每小时一个点）
      const hours = []
      const hourMap = new Map() // 用于按小时聚合数据
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now)
        time.setHours(time.getHours() - i)
        const hourKey = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}`
        hours.push(pad(time.getHours()) + ':00')
        hourMap.set(hourKey, { open: 0, closed: 0 })
      }
      
      // 按小时聚合开门和关门次数
      for (const record of rows) {
        if (record.doorStatus && (record.doorStatus === 'open' || record.doorStatus === 'closed')) {
          const reportTime = record.reportTime || record.report_time || record.createdAt
          if (!reportTime) continue
          
          // 解析上报时间，提取年月日小时
          const reportDate = new Date(reportTime)
          if (isNaN(reportDate.getTime())) continue
          
          const hourKey = `${reportDate.getFullYear()}-${pad(reportDate.getMonth() + 1)}-${pad(reportDate.getDate())} ${pad(reportDate.getHours())}`
          
          if (hourMap.has(hourKey)) {
            const hourData = hourMap.get(hourKey)
            if (record.doorStatus === 'open') {
              hourData.open++
            } else if (record.doorStatus === 'closed') {
              hourData.closed++
            }
          }
        }
      }
      
      // 转换为数组，按时间顺序
      const openData = []
      const closedData = []
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now)
        time.setHours(time.getHours() - i)
        const hourKey = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}`
        const hourData = hourMap.get(hourKey) || { open: 0, closed: 0 }
        openData.push(hourData.open)
        closedData.push(hourData.closed)
      }
      
      // 更新图表
      updateTrendChart(hours, openData, closedData)
    } else {
      // 如果接口失败，使用空数据
      const hours = []
      const openData = []
      const closedData = []
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now)
        time.setHours(time.getHours() - i)
        hours.push(pad(time.getHours()) + ':00')
        openData.push(0)
        closedData.push(0)
      }
      
      updateTrendChart(hours, openData, closedData)
    }
  } catch (error) {
    console.error('加载趋势图数据失败:', error)
    // 失败时使用空数据
    const now = new Date()
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
    const hours = []
    const openData = []
    const closedData = []
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now)
      time.setHours(time.getHours() - i)
      hours.push(pad(time.getHours()) + ':00')
      openData.push(0)
      closedData.push(0)
    }
    
    updateTrendChart(hours, openData, closedData)
  }
}

// 更新趋势图
const updateTrendChart = (hours, openData, closedData) => {
  if (!trendChart) {
    initTrendChart()
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['开门次数', '关门次数'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hours
    },
    yAxis: {
      type: 'value',
      name: '次数'
    },
    series: [
      {
        name: '开门次数',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#E6A23C' },
        areaStyle: { color: 'rgba(230, 162, 60, 0.2)' },
        data: openData
      },
      {
        name: '关门次数',
        type: 'line',
        smooth: true,
        itemStyle: { color: '#67C23A' },
        areaStyle: { color: 'rgba(103, 194, 58, 0.2)' },
        data: closedData
      }
    ]
  }
  
  trendChart.setOption(option)
}

const initTrendChart = () => {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  // 初始化时使用空数据，等待 loadTrendChartData 加载真实数据
  const now = new Date()
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`)
  const hours = []
  const openData = []
  const closedData = []
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now)
    time.setHours(time.getHours() - i)
    hours.push(pad(time.getHours()) + ':00')
    openData.push(0)
    closedData.push(0)
  }
  
  updateTrendChart(hours, openData, closedData)
}

const handleAlertMessage = (message) => {
  if (message.type === 'new_alert') {
    loadDoorAlerts()
    loadAlertStats()
  }
}

const handleMonitorMessage = (message) => {
  if (message.type === 'device_status_update' || message.type === 'device_status_change') {
    // 实时更新门禁统计
    loadDoorStatistics()
    // 更新图表
    if (doorStatusChart) {
      initDoorStatusChart()
    }
    // 更新趋势图数据（使用防抖，避免频繁刷新）
    if (trendChart) {
      clearTimeout(trendChart.refreshTimer)
      trendChart.refreshTimer = setTimeout(() => {
        loadTrendChartData()
      }, 2000) // 2秒防抖
    }
  }
}

onMounted(async () => {
  await loadStatistics()
  await loadAlertStats()
  await loadDoorAlerts()
  await loadRecentOperations()
  
  await nextTick()
  initDoorStatusChart()
  initTrendChart()
  // 加载趋势图真实数据
  await loadTrendChartData()
  
  // 监听告警WebSocket消息
  wsManager.onAlertsMessage(handleAlertMessage)
  // 监听监控WebSocket消息
  wsManager.onMonitorMessage(handleMonitorMessage)
})

onUnmounted(() => {
  if (doorStatusChart) {
    doorStatusChart.dispose()
  }
  if (trendChart) {
    trendChart.dispose()
  }
  wsManager.offAlertsMessage(handleAlertMessage)
  wsManager.offMonitorMessage(handleMonitorMessage)
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-right: 15px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-summary {
  max-height: 400px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  border-left: 4px solid;
  transition: all 0.3s;
}

.alert-item:hover {
  background-color: #f5f7fa;
  transform: translateX(2px);
}

.alert-item.alert-critical {
  border-left-color: #F56C6C;
  background-color: #fef0f0;
}

.alert-item.alert-error {
  border-left-color: #F56C6C;
  background-color: #fef0f0;
}

.alert-item.alert-warning {
  border-left-color: #E6A23C;
  background-color: #fdf6ec;
}

.alert-item.alert-info {
  border-left-color: #409EFF;
  background-color: #ecf5ff;
}

.alert-icon {
  font-size: 24px;
  margin-right: 12px;
  color: #606266;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.alert-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #C0C4CC;
}

.alert-status {
  margin-left: 12px;
}

.no-alerts {
  padding: 40px 0;
  text-align: center;
}
</style>

