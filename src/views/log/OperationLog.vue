<template>
  <div class="operation-log">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户ID">
          <el-input-number v-model="searchForm.userId" placeholder="用户ID" :min="1" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-input v-model="searchForm.operationType" placeholder="操作类型" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="操作模块">
          <el-input v-model="searchForm.operationModule" placeholder="操作模块" clearable style="width: 150px" />
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
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="logList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="operationType" label="操作类型" width="120" />
        <el-table-column prop="operationModule" label="操作模块" width="120" />
        <el-table-column prop="operationDesc" label="操作描述" />
        <el-table-column prop="requestMethod" label="请求方法" width="100" />
        <el-table-column prop="requestUrl" label="请求URL" />
        <el-table-column prop="ipAddress" label="IP地址" width="150" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误信息" />
        <el-table-column prop="executeTime" label="执行耗时" width="100">
          <template #default="{ row }">
            {{ row.executeTime ? row.executeTime + 'ms' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="操作时间" width="180" />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getOperationLogs } from '@/api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const logList = ref([])

const searchForm = reactive({
  userId: null,
  operationType: '',
  operationModule: '',
  startTime: '',
  endTime: '',
  status: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getOperationLogs(params)
    if (res.code === 1) {
      logList.value = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取操作日志失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadLogs()
}

const handleReset = () => {
  Object.assign(searchForm, {
    userId: null,
    operationType: '',
    operationModule: '',
    startTime: '',
    endTime: '',
    status: null
  })
  handleSearch()
}

const handleSizeChange = () => {
  loadLogs()
}

const handlePageChange = () => {
  loadLogs()
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.operation-log {
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

