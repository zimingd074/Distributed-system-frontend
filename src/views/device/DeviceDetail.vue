<template>
  <div class="device-detail" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>设备详情</span>
          <div>
            <el-button @click="$router.back()">返回</el-button>
            <el-button type="primary" @click="$router.push(`/devices/${deviceId}/config`)">配置</el-button>
            <el-button type="primary" @click="$router.push(`/devices/${deviceId}/status`)">状态</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border v-if="deviceInfo">
        <el-descriptions-item label="设备编码">{{ deviceInfo.deviceCode }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ deviceInfo.deviceName }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ deviceInfo.deviceType }}</el-descriptions-item>
        <el-descriptions-item label="所属分组">{{ deviceInfo.groupName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="IP地址">{{ deviceInfo.ipAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="端口号">{{ deviceInfo.port || '-' }}</el-descriptions-item>
        <el-descriptions-item label="MAC地址">{{ deviceInfo.macAddress || '-' }}</el-descriptions-item>
        <el-descriptions-item label="物理位置">{{ deviceInfo.location || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备状态">
          <el-tag :type="getStatusType(deviceInfo.status)">{{ deviceInfo.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="在线状态">
          <el-tag :type="deviceInfo.onlineStatus === 1 ? 'success' : 'danger'">
            {{ deviceInfo.onlineStatus === 1 ? '在线' : '离线' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最后心跳时间">{{ deviceInfo.lastHeartbeatTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ deviceInfo.registerTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ deviceInfo.createdAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ deviceInfo.updatedAt || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备描述" :span="2">{{ deviceInfo.description || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-card v-if="deviceInfo && deviceInfo.currentStatus" style="margin-top: 20px;">
        <template #header>
          <span>门禁实时状态</span>
        </template>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="status-item">
              <div class="status-label">门状态</div>
              <div class="status-value">
                <el-tag :type="deviceInfo.currentStatus.doorStatus === 'open' ? 'danger' : 'success'">
                  {{ deviceInfo.currentStatus.doorStatus === 'open' ? '打开' : '关闭' }}
                </el-tag>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="status-item">
              <div class="status-label">控制器状态</div>
              <div class="status-value">
                <el-tag :type="deviceInfo.currentStatus.doorControllerStatus === 'normal' ? 'success' : 'danger'">
                  {{ deviceInfo.currentStatus.doorControllerStatus || '未知' }}
                </el-tag>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="status-item">
              <div class="status-label">最近上报时间</div>
              <div class="status-value small">
                {{ deviceInfo.currentStatus.reportTime || '-' }}
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDeviceDetail } from '@/api'
import { ElMessage } from 'element-plus'

const route = useRoute()
const deviceId = route.params.id

const loading = ref(false)
const deviceInfo = ref(null)

const getStatusType = (status) => {
  const map = {
    online: 'success',
    offline: 'danger',
    fault: 'danger',
    maintain: 'warning'
  }
  return map[status] || 'info'
}

const loadDeviceDetail = async () => {
  loading.value = true
  try {
    const res = await getDeviceDetail(deviceId)
    if (res.code === 1) {
      deviceInfo.value = res.data
    }
  } catch (error) {
    ElMessage.error('获取设备详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDeviceDetail()
})
</script>

<style scoped>
.device-detail {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.status-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.status-value.small {
  font-size: 16px;
}
</style>

