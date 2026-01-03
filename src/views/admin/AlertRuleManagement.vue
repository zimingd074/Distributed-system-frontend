<template>
  <div class="alert-rule-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>告警规则管理</span>
          <el-button type="primary" @click="handleAdd">添加规则</el-button>
        </div>
      </template>

      <el-table :data="ruleList" v-loading="loading" style="width: 100%">
        <el-table-column prop="ruleName" label="规则名称" />
        <el-table-column prop="ruleCode" label="规则编码" />
        <el-table-column prop="ruleType" label="规则类型" width="120" />
        <el-table-column prop="alertLevel" label="告警级别" width="120">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.alertLevel)">{{ getLevelText(row.alertLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="conditionExpr" label="触发条件" />
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

    <!-- 添加/编辑规则对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form ref="ruleFormRef" :model="ruleForm" :rules="ruleRules" label-width="120px">
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="ruleForm.ruleName" />
        </el-form-item>
        <el-form-item label="规则编码" prop="ruleCode" v-if="!isEdit">
          <el-input v-model="ruleForm.ruleCode" />
        </el-form-item>
        <el-form-item label="规则类型" prop="ruleType">
          <el-select v-model="ruleForm.ruleType" style="width: 100%">
            <el-option label="离线检测" value="offline" />
            <el-option label="阈值检测" value="threshold" />
            <el-option label="异常检测" value="abnormal" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备分组" prop="deviceGroupId">
          <el-select v-model="ruleForm.deviceGroupId" placeholder="全部（全局规则）" clearable style="width: 100%">
            <el-option
              v-for="group in deviceGroups"
              :key="group.id"
              :label="group.groupName"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="条件表达式" prop="conditionExpr">
          <el-input v-model="ruleForm.conditionExpr" type="textarea" :rows="3" placeholder="例如: cpu_usage > 90" />
        </el-form-item>
        <el-form-item label="告警级别" prop="alertLevel">
          <el-select v-model="ruleForm.alertLevel" style="width: 100%">
            <el-option label="严重" value="critical" />
            <el-option label="错误" value="error" />
            <el-option label="警告" value="warning" />
            <el-option label="信息" value="info" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警消息" prop="alertMessage">
          <el-input v-model="ruleForm.alertMessage" type="textarea" :rows="2" placeholder="告警消息模板，例如: CPU使用率超过90%" />
        </el-form-item>
        <el-form-item label="是否启用" prop="isActive">
          <el-switch v-model="ruleForm.isActive" />
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
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, getDeviceGroups } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const ruleList = ref([])
const deviceGroups = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加规则')
const isEdit = ref(false)
const submitting = ref(false)
const ruleFormRef = ref(null)
const currentRuleId = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const ruleForm = reactive({
  ruleName: '',
  ruleCode: '',
  ruleType: 'threshold',
  deviceGroupId: null,
  conditionExpr: '',
  alertLevel: 'warning',
  alertMessage: '',
  isActive: true
})

const ruleRules = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  ruleCode: [{ required: true, message: '请输入规则编码', trigger: 'blur' }],
  ruleType: [{ required: true, message: '请选择规则类型', trigger: 'change' }],
  conditionExpr: [{ required: true, message: '请输入条件表达式', trigger: 'blur' }],
  alertLevel: [{ required: true, message: '请选择告警级别', trigger: 'change' }]
}

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

const loadRules = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getAlertRules(params)
    if (res.code === 1) {
      ruleList.value = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取告警规则失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加规则'
  isEdit.value = false
  currentRuleId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑规则'
  isEdit.value = true
  currentRuleId.value = row.id
  Object.assign(ruleForm, {
    ruleName: row.ruleName,
    ruleCode: row.ruleCode,
    ruleType: row.ruleType,
    deviceGroupId: row.deviceGroupId || null,
    conditionExpr: row.conditionExpr || '',
    alertLevel: row.alertLevel,
    alertMessage: row.alertMessage || '',
    isActive: row.isActive
  })
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除规则 "${row.ruleName}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await deleteAlertRule(row.id)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      loadRules()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!ruleFormRef.value) return
  
  await ruleFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let res
        if (isEdit.value) {
          res = await updateAlertRule(currentRuleId.value, ruleForm)
        } else {
          res = await createAlertRule(ruleForm)
        }
        
        if (res.code === 1) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadRules()
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
  Object.assign(ruleForm, {
    ruleName: '',
    ruleCode: '',
    ruleType: 'threshold',
    deviceGroupId: null,
    conditionExpr: '',
    alertLevel: 'warning',
    alertMessage: '',
    isActive: true
  })
  if (ruleFormRef.value) {
    ruleFormRef.value.clearValidate()
  }
}

const handleSizeChange = () => {
  loadRules()
}

const handlePageChange = () => {
  loadRules()
}

onMounted(() => {
  loadDeviceGroups()
  loadRules()
})
</script>

<style scoped>
.alert-rule-management {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

