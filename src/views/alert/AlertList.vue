<template>
  <div class="alert-list">
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">总告警数</div>
            <div class="stat-value">{{ statistics.totalCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">待处理</div>
            <div class="stat-value warning">{{ statistics.pendingCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">已确认</div>
            <div class="stat-value info">{{ statistics.confirmedCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">已解决</div>
            <div class="stat-value success">{{ statistics.resolvedCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>告警列表</span>
          <div>
            <el-button type="primary" size="small" @click="$router.push('/admin/alert-rules')">规则管理</el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="设备">
          <el-select v-model="searchForm.deviceId" placeholder="全部" clearable style="width: 200px">
            <el-option
              v-for="device in deviceList"
              :key="device.id"
              :label="device.deviceName"
              :value="device.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="告警级别">
          <el-select v-model="searchForm.alertLevel" placeholder="全部" clearable>
            <el-option label="严重" value="critical" />
            <el-option label="错误" value="error" />
            <el-option label="警告" value="warning" />
            <el-option label="信息" value="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已忽略" value="ignored" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="searchForm.startTime"
            type="datetime"
            placeholder="选择开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="searchForm.endTime"
            type="datetime"
            placeholder="选择结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="alertList" v-loading="loading" style="width: 100%">
        <el-table-column prop="alertNo" label="告警编号" width="180" />
        <el-table-column prop="deviceName" label="设备名称" />
        <el-table-column prop="alertLevel" label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.alertLevel)">{{ getLevelText(row.alertLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alertType" label="类型" width="150" />
        <el-table-column prop="alertMessage" label="告警消息" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alertTime" label="告警时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              @click="handleConfirm(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'confirmed'"
              type="warning"
              link
              @click="handleResolve(row)"
            >
              解决
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="info"
              link
              @click="handleIgnore(row)"
            >
              忽略
            </el-button>
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

    <!-- 告警详情对话框 -->
    <el-dialog v-model="detailVisible" title="告警详情" width="800px">
      <el-descriptions :column="2" border v-if="alertDetail">
        <el-descriptions-item label="告警编号">{{ alertDetail.alertNo }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ alertDetail.deviceName }}</el-descriptions-item>
        <el-descriptions-item label="告警级别">
          <el-tag :type="getLevelType(alertDetail.alertLevel)">{{ getLevelText(alertDetail.alertLevel) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="告警类型">{{ alertDetail.alertType }}</el-descriptions-item>
        <el-descriptions-item label="告警消息" :span="2">{{ alertDetail.alertMessage }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(alertDetail.status)">{{ getStatusText(alertDetail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="告警时间">{{ alertDetail.alertTime }}</el-descriptions-item>
        <el-descriptions-item label="确认用户" v-if="alertDetail.confirmedUser">{{ alertDetail.confirmedUser }}</el-descriptions-item>
        <el-descriptions-item label="确认时间" v-if="alertDetail.confirmedTime">{{ alertDetail.confirmedTime }}</el-descriptions-item>
        <el-descriptions-item label="解决用户" v-if="alertDetail.resolvedUser">{{ alertDetail.resolvedUser }}</el-descriptions-item>
        <el-descriptions-item label="解决时间" v-if="alertDetail.resolvedTime">{{ alertDetail.resolvedTime }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAlertStore } from '@/stores/alert'
import { getAlerts, getAlertDetail, confirmAlert, resolveAlert, ignoreAlert, getAlertStatistics } from '@/api'
import { getDevices } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import wsManager from '@/utils/websocket'

const alertStore = useAlertStore()

const loading = ref(false)
const alertList = ref([])
const deviceList = ref([])
const statistics = ref({})
const detailVisible = ref(false)
const alertDetail = ref(null)

const searchForm = reactive({
  deviceId: null,
  alertLevel: '',
  status: '',
  startTime: '',
  endTime: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const getLevelType = (level) => {
  const map = {
    critical: 'danger',
    error: 'danger',
    warning: 'warning',
    info: 'info'
  }
  return map[level] || 'info'
}

const getLevelText = (level) => {
  const map = {
    critical: '严重',
    error: '错误',
    warning: '警告',
    info: '信息'
  }
  return map[level] || level
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

const loadAlerts = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getAlerts(params)
    if (res.code === 1) {
      alertList.value = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取告警列表失败')
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const res = await getAlertStatistics()
    if (res.code === 1) {
      statistics.value = res.data || {}
    }
  } catch (error) {
    console.error('获取告警统计失败:', error)
  }
}

const loadDevices = async () => {
  try {
    const res = await getDevices({ page: 1, pageSize: 1000 })
    if (res.code === 1) {
      deviceList.value = res.data.rows || []
    }
  } catch (error) {
    console.error('获取设备列表失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadAlerts()
}

const handleReset = () => {
  Object.assign(searchForm, {
    deviceId: null,
    alertLevel: '',
    status: '',
    startTime: '',
    endTime: ''
  })
  handleSearch()
}

const handleView = async (row) => {
  try {
    const res = await getAlertDetail(row.alertId)
    if (res.code === 1) {
      alertDetail.value = res.data
      detailVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取告警详情失败')
  }
}

const handleConfirm = async (row) => {
  try {
    const res = await confirmAlert(row.alertId)
    if (res.code === 1) {
      ElMessage.success('告警已确认')
      loadAlerts()
      loadStatistics()
    }
  } catch (error) {
    ElMessage.error('确认告警失败')
  }
}

const handleResolve = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入处理备注', '解决告警', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea'
    })
    
    const res = await resolveAlert(row.alertId, { resolveRemark: value })
    if (res.code === 1) {
      ElMessage.success('告警已解决')
      loadAlerts()
      loadStatistics()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('解决告警失败')
    }
  }
}

const handleIgnore = async (row) => {
  try {
    await ElMessageBox.confirm('确定要忽略此告警吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await ignoreAlert(row.alertId)
    if (res.code === 1) {
      ElMessage.success('告警已忽略')
      loadAlerts()
      loadStatistics()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('忽略告警失败')
    }
  }
}

const handleSizeChange = () => {
  loadAlerts()
}

const handlePageChange = () => {
  loadAlerts()
}

const handleAlertMessage = (message) => {
  if (message.type === 'new_alert') {
    loadAlerts()
    loadStatistics()
  }
}

onMounted(() => {
  loadAlerts()
  loadStatistics()
  loadDevices()
  
  // 监听告警WebSocket消息
  wsManager.onAlertsMessage(handleAlertMessage)
})
</script>

<style scoped>
.alert-list {
  padding: 0;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-value.warning {
  color: #E6A23C;
}

.stat-value.info {
  color: #409EFF;
}

.stat-value.success {
  color: #67C23A;
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

