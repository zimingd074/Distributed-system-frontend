<template>
  <div class="report-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报表管理</span>
          <el-button type="primary" @click="handleGenerate">生成报表</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="生成报表" name="generate">
          <el-form :model="generateForm" label-width="120px" style="max-width: 600px;">
            <el-form-item label="报表类型" required>
              <el-select v-model="generateForm.reportCode" placeholder="请选择报表类型" style="width: 100%">
                <el-option
                  v-for="config in reportConfigs"
                  :key="config.reportCode"
                  :label="config.reportName"
                  :value="config.reportCode"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="文件格式" required>
              <el-radio-group v-model="generateForm.fileFormat">
                <el-radio label="excel">Excel</el-radio>
                <el-radio label="pdf">PDF</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="generateForm.params.startTime"
                type="date"
                placeholder="选择开始时间"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="generateForm.params.endTime"
                type="date"
                placeholder="选择结束时间"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="选择设备">
              <el-select
                v-model="generateForm.params.deviceIds"
                multiple
                placeholder="请选择设备（可选）"
                style="width: 100%"
              >
                <el-option
                  v-for="device in deviceList"
                  :key="device.id"
                  :label="device.deviceName"
                  :value="device.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSubmit" :loading="submitting">生成报表</el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="报表记录" name="logs">
          <el-form :inline="true" :model="logSearchForm" style="margin-bottom: 20px;">
            <el-form-item label="报表编码">
              <el-input v-model="logSearchForm.reportCode" placeholder="报表编码" clearable style="width: 200px" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="logSearchForm.status" placeholder="全部" clearable style="width: 150px">
                <el-option label="生成中" value="generating" />
                <el-option label="成功" value="success" />
                <el-option label="失败" value="failed" />
              </el-select>
            </el-form-item>
            <el-form-item label="开始时间">
              <el-date-picker
                v-model="logSearchForm.startTime"
                type="date"
                placeholder="选择开始时间"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="结束时间">
              <el-date-picker
                v-model="logSearchForm.endTime"
                type="date"
                placeholder="选择结束时间"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleLogSearch">查询</el-button>
              <el-button @click="handleLogReset">重置</el-button>
            </el-form-item>
          </el-form>
          
          <el-table :data="reportLogs" v-loading="logsLoading" style="width: 100%">
            <el-table-column prop="reportName" label="报表名称" />
            <el-table-column prop="reportCode" label="报表编码" />
            <el-table-column prop="fileFormat" label="文件格式" width="100">
              <template #default="{ row }">
                <el-tag>{{ row.fileFormat.toUpperCase() }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="fileSize" label="文件大小" width="120">
              <template #default="{ row }">
                {{ row.fileSize ? formatFileSize(row.fileSize) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="generateTime" label="生成时间" width="180" />
            <el-table-column prop="completeTime" label="完成时间" width="180" />
            <el-table-column prop="errorMessage" label="错误信息" />
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'success' && row.id"
                  type="primary"
                  link
                  @click="handleDownload(row)"
                >
                  下载
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="logPagination.page"
            v-model:page-size="logPagination.pageSize"
            :total="logPagination.total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleLogSizeChange"
            @current-change="handleLogPageChange"
            style="margin-top: 20px; justify-content: flex-end;"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getReportConfigs, generateReport, getReportLogs, downloadReport } from '@/api'
import { getDevices } from '@/api'
import { ElMessage } from 'element-plus'

const activeTab = ref('generate')
const reportConfigs = ref([])
const deviceList = ref([])
const reportLogs = ref([])
const logsLoading = ref(false)
const submitting = ref(false)

const logSearchForm = reactive({
  reportCode: '',
  status: '',
  startTime: '',
  endTime: ''
})

const logPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const generateForm = reactive({
  reportCode: '',
  fileFormat: 'excel',
  params: {
    startTime: '',
    endTime: '',
    deviceIds: []
  }
})

const getStatusType = (status) => {
  const map = {
    success: 'success',
    generating: 'warning',
    failed: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    success: '成功',
    generating: '生成中',
    failed: '失败'
  }
  return map[status] || status
}

const loadReportConfigs = async () => {
  try {
    const res = await getReportConfigs()
    if (res.code === 1) {
      reportConfigs.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取报表配置失败')
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

const loadReportLogs = async () => {
  logsLoading.value = true
  try {
    const params = {
      ...logSearchForm,
      page: logPagination.page,
      pageSize: logPagination.pageSize
    }
    const res = await getReportLogs(params)
    if (res.code === 1) {
      reportLogs.value = res.data.rows || []
      logPagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取报表记录失败')
  } finally {
    logsLoading.value = false
  }
}

const handleLogSearch = () => {
  logPagination.page = 1
  loadReportLogs()
}

const handleLogReset = () => {
  Object.assign(logSearchForm, {
    reportCode: '',
    status: '',
    startTime: '',
    endTime: ''
  })
  handleLogSearch()
}

const handleLogSizeChange = () => {
  loadReportLogs()
}

const handleLogPageChange = () => {
  loadReportLogs()
}

const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const handleGenerate = () => {
  activeTab.value = 'generate'
}

const resetForm = () => {
  Object.assign(generateForm, {
    reportCode: '',
    fileFormat: 'excel',
    params: {
      startTime: '',
      endTime: '',
      deviceIds: []
    }
  })
}

const handleSubmit = async () => {
  if (!generateForm.reportCode) {
    ElMessage.warning('请选择报表类型')
    return
  }
  
  submitting.value = true
  try {
    const res = await generateReport(generateForm)
    if (res.code === 1) {
      ElMessage.success('报表生成任务已创建')
      resetForm()
      activeTab.value = 'logs'
      loadReportLogs()
    }
  } catch (error) {
    ElMessage.error('生成报表失败')
  } finally {
    submitting.value = false
  }
}

const handleDownload = async (row) => {
  try {
    // 接口文档中报表记录响应字段是id，下载接口路径参数也是id
    const reportId = row.id || row.reportLogId
    const res = await downloadReport(reportId)
    // 创建下载链接
    const blob = new Blob([res], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${row.reportName}.${row.fileFormat}`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

onMounted(() => {
  loadReportConfigs()
  loadDevices()
  loadReportLogs()
})
</script>

<style scoped>
.report-list {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

