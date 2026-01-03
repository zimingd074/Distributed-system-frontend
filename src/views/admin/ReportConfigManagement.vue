<template>
  <div class="report-config-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报表配置管理</span>
          <el-button type="primary" @click="handleAdd">添加配置</el-button>
        </div>
      </template>

      <el-table :data="configList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="reportCode" label="报表编码" />
        <el-table-column prop="reportName" label="报表名称" />
        <el-table-column prop="reportType" label="报表类型" width="120" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
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

    <!-- 添加/编辑配置对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form ref="configFormRef" :model="configForm" :rules="configRules" label-width="120px">
        <el-form-item label="报表编码" prop="reportCode">
          <el-input v-model="configForm.reportCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="报表名称" prop="reportName">
          <el-input v-model="configForm.reportName" />
        </el-form-item>
        <el-form-item label="报表类型" prop="reportType">
          <el-select v-model="configForm.reportType" style="width: 100%">
            <el-option label="设备报表" value="device" />
            <el-option label="状态报表" value="status" />
            <el-option label="告警报表" value="alert" />
            <el-option label="命令报表" value="command" />
          </el-select>
        </el-form-item>
        <el-form-item label="报表模板" prop="reportTemplate">
          <el-input v-model="configForm.reportTemplate" placeholder="例如: /templates/device.xlsx" />
        </el-form-item>
        <el-form-item label="查询SQL" prop="querySql">
          <el-input v-model="configForm.querySql" type="textarea" :rows="4" placeholder="SELECT * FROM..." />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="configForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="是否启用" prop="isActive">
          <el-switch v-model="configForm.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getAdminReportConfigs, createReportConfig, updateReportConfig, deleteReportConfig } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const configList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加配置')
const isEdit = ref(false)
const submitting = ref(false)
const configFormRef = ref(null)
const currentConfigId = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const configForm = reactive({
  reportCode: '',
  reportName: '',
  reportType: 'device',
  reportTemplate: '',
  querySql: '',
  description: '',
  isActive: true
})

const configRules = {
  reportCode: [{ required: true, message: '请输入报表编码', trigger: 'blur' }],
  reportName: [{ required: true, message: '请输入报表名称', trigger: 'blur' }],
  reportType: [{ required: true, message: '请选择报表类型', trigger: 'change' }]
}

const loadConfigs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getAdminReportConfigs(params)
    if (res.code === 1) {
      configList.value = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取报表配置失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加配置'
  isEdit.value = false
  currentConfigId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑配置'
  isEdit.value = true
  currentConfigId.value = row.id
  Object.assign(configForm, {
    reportCode: row.reportCode,
    reportName: row.reportName,
    reportType: row.reportType || 'device',
    reportTemplate: row.reportTemplate || '',
    querySql: row.querySql || '',
    description: row.description || '',
    isActive: row.isActive
  })
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置 "${row.reportName}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await deleteReportConfig(row.id)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      loadConfigs()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!configFormRef.value) return
  
  await configFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let res
        if (isEdit.value) {
          res = await updateReportConfig(currentConfigId.value, configForm)
        } else {
          res = await createReportConfig(configForm)
        }
        
        if (res.code === 1) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadConfigs()
        }
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const resetForm = () => {
  Object.assign(configForm, {
    reportCode: '',
    reportName: '',
    reportType: 'device',
    reportTemplate: '',
    querySql: '',
    description: '',
    isActive: true
  })
  if (configFormRef.value) {
    configFormRef.value.clearValidate()
  }
}

const handleSizeChange = () => {
  loadConfigs()
}

const handlePageChange = () => {
  loadConfigs()
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.report-config-management {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

