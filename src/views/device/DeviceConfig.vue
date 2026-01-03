<template>
  <div class="device-config" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备配置 - {{ deviceName }}</span>
          <div>
            <el-button @click="$router.back()">返回</el-button>
            <el-button type="primary" @click="handleSync" :disabled="!hasUnsynced">同步配置</el-button>
            <el-button type="primary" @click="handleAddConfig">添加配置</el-button>
          </div>
        </div>
      </template>

      <el-table :data="configList" style="width: 100%">
        <el-table-column prop="configKey" label="配置键" width="200" />
        <el-table-column prop="configValue" label="配置值" />
        <el-table-column prop="configType" label="类型" width="100" />
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="isSynced" label="同步状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isSynced ? 'success' : 'warning'">
              {{ row.isSynced ? '已同步' : '未同步' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="syncTime" label="同步时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 配置编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form ref="configFormRef" :model="configForm" :rules="configRules" label-width="100px">
        <el-form-item label="配置键" prop="configKey">
          <el-input v-model="configForm.configKey" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="配置值" prop="configValue">
          <el-input v-model="configForm.configValue" />
        </el-form-item>
        <el-form-item label="配置类型" prop="configType">
          <el-select v-model="configForm.configType" style="width: 100%">
            <el-option label="字符串" value="string" />
            <el-option label="数字" value="number" />
            <el-option label="布尔值" value="boolean" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明" prop="description">
          <el-input v-model="configForm.description" type="textarea" :rows="3" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDeviceConfig, updateDeviceConfig, syncDeviceConfig, getDeviceDetail } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const deviceId = route.params.id

const loading = ref(false)
const configList = ref([])
const deviceName = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('添加配置')
const isEdit = ref(false)
const submitting = ref(false)
const configFormRef = ref(null)
const currentConfigId = ref(null)

const configForm = reactive({
  configKey: '',
  configValue: '',
  configType: 'string',
  description: ''
})

const configRules = {
  configKey: [{ required: true, message: '请输入配置键', trigger: 'blur' }],
  configValue: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
  configType: [{ required: true, message: '请选择配置类型', trigger: 'change' }]
}

const hasUnsynced = computed(() => {
  return configList.value.some(item => !item.isSynced)
})

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getDeviceConfig(deviceId)
    if (res.code === 1) {
      configList.value = res.data || []
    }
  } catch (error) {
    ElMessage.error('获取设备配置失败')
  } finally {
    loading.value = false
  }
}

const loadDeviceName = async () => {
  try {
    const res = await getDeviceDetail(deviceId)
    if (res.code === 1) {
      deviceName.value = res.data.deviceName || ''
    }
  } catch (error) {
    console.error('获取设备名称失败:', error)
  }
}

const handleAddConfig = () => {
  dialogTitle.value = '添加配置'
  isEdit.value = false
  currentConfigId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑配置'
  isEdit.value = true
  currentConfigId.value = row.configId
  Object.assign(configForm, {
    configKey: row.configKey,
    configValue: row.configValue,
    configType: row.configType,
    description: row.description
  })
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除配置 "${row.configKey}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    // 这里需要调用删除接口，如果接口文档中没有，可以提示
    ElMessage.warning('删除功能需要后端支持')
  } catch (error) {
    // 用户取消
  }
}

const handleSync = async () => {
  try {
    await ElMessageBox.confirm('确定要同步配置到设备吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await syncDeviceConfig(deviceId)
    if (res.code === 1) {
      ElMessage.success('配置同步成功')
      loadConfig()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('配置同步失败')
    }
  }
}

const resetForm = () => {
  Object.assign(configForm, {
    configKey: '',
    configValue: '',
    configType: 'string',
    description: ''
  })
  if (configFormRef.value) {
    configFormRef.value.clearValidate()
  }
}

const handleSubmit = async () => {
  if (!configFormRef.value) return
  
  await configFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const configs = [{
          configKey: configForm.configKey,
          configValue: configForm.configValue
        }]
        
        const res = await updateDeviceConfig(deviceId, { configs })
        if (res.code === 1) {
          ElMessage.success('配置更新成功')
          dialogVisible.value = false
          loadConfig()
        }
      } catch (error) {
        ElMessage.error('配置更新失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadDeviceName()
  loadConfig()
})
</script>

<style scoped>
.device-config {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

