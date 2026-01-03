import request from '@/utils/request'
import axios from 'axios'

// ==================== 认证授权接口 ====================

/**
 * 用户登录
 */
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  })
}

/**
 * 用户登出
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  })
}

/**
 * 刷新Token
 * 注意：refreshToken需要通过Header传递，而不是body
 * 注意：此请求不应该使用accessToken，而是使用refreshToken
 */
export function refreshToken(refreshToken) {
  // 直接使用axios，避免请求拦截器添加accessToken
  const baseURL = import.meta.env.DEV 
    ? '/api'
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api')
  
  return axios({
    url: `${baseURL}/auth/refresh`,
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshToken}`
    },
    timeout: 30000
  }).then(response => {
    const res = response.data
    if (res.code !== undefined && res.code !== 1) {
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return res
  }).catch(error => {
    if (error.response) {
      const res = error.response.data
      return Promise.reject(new Error(res?.msg || '请求失败'))
    }
    return Promise.reject(error)
  })
}

/**
 * 获取当前用户信息
 */
export function getProfile() {
  return request({
    url: '/auth/profile',
    method: 'get'
  })
}

// ==================== 设备管理接口 ====================

/**
 * 获取设备列表
 */
export function getDevices(params) {
  return request({
    url: '/devices',
    method: 'get',
    params
  })
}

/**
 * 获取设备详情
 */
export function getDeviceDetail(id) {
  return request({
    url: `/devices/${id}`,
    method: 'get'
  })
}

/**
 * 添加设备
 */
export function addDevice(data) {
  return request({
    url: '/devices',
    method: 'post',
    data
  })
}

/**
 * 更新设备信息
 */
export function updateDevice(id, data) {
  return request({
    url: `/devices/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除设备
 */
export function deleteDevice(id) {
  return request({
    url: `/devices/${id}`,
    method: 'delete'
  })
}

/**
 * 获取设备分组
 */
export function getDeviceGroups() {
  return request({
    url: '/devices/device-groups',
    method: 'get'
  })
}

/**
 * 获取设备统计
 */
export function getDeviceStatistics() {
  return request({
    url: '/devices/statistics',
    method: 'get'
  })
}

// ==================== 设备配置接口 ====================

/**
 * 获取设备配置
 */
export function getDeviceConfig(id) {
  return request({
    url: `/devices/${id}/config`,
    method: 'get'
  })
}

/**
 * 更新设备配置
 */
export function updateDeviceConfig(id, data) {
  return request({
    url: `/devices/${id}/config`,
    method: 'put',
    data
  })
}

/**
 * 同步配置到设备
 */
export function syncDeviceConfig(id) {
  return request({
    url: `/devices/${id}/config/sync`,
    method: 'post'
  })
}

// ==================== 命令控制接口 ====================

/**
 * 获取命令列表
 */
export function getCommands(params) {
  return request({
    url: '/devices/commands',
    method: 'get',
    params
  })
}

/**
 * 发送控制命令
 */
export function sendCommand(deviceId, data) {
  return request({
    url: `/devices/${deviceId}/commands`,
    method: 'post',
    data
  })
}

/**
 * 查询命令执行状态
 */
export function getCommandLog(id) {
  return request({
    url: `/devices/commands/logs/${id}`,
    method: 'get'
  })
}

/**
 * 获取命令执行历史
 */
export function getCommandHistory(deviceId, params) {
  return request({
    url: `/devices/${deviceId}/commands/history`,
    method: 'get',
    params
  })
}

// ==================== 状态监控接口 ====================

/**
 * 获取设备实时状态
 */
export function getDeviceStatus(id) {
  return request({
    url: `/devices/${id}/status`,
    method: 'get'
  })
}

/**
 * 获取设备状态历史
 */
export function getDeviceStatusHistory(id, params) {
  return request({
    url: `/devices/${id}/status/history`,
    method: 'get',
    params
  })
}

/**
 * 批量获取设备状态历史（按时间范围，支持多设备筛选）
 */
export function getAllDeviceStatusHistory(params) {
  return request({
    url: '/devices/status/history',
    method: 'get',
    params
  })
}

/**
 * 获取设备心跳记录
 */
export function getDeviceHeartbeat(id, params) {
  return request({
    url: `/devices/${id}/heartbeat`,
    method: 'get',
    params
  })
}

// ==================== 告警管理接口 ====================

/**
 * 获取告警列表
 */
export function getAlerts(params) {
  return request({
    url: '/alerts',
    method: 'get',
    params
  })
}

/**
 * 发送/创建告警（设备向服务器上报告警）
 * POST /alerts
 * data 示例：
 * {
 *   deviceId: 1,
 *   deviceCode: 'DEV-001',
 *   alertType: 'door_not_closed_timeout',
 *   alertLevel: 'error',
 *   alertMessage: '门未关超过30秒',
 *   alertTime: '2026-01-02 12:00:00'
 * }
 */
export function sendAlert(data) {
  return request({
    url: '/alerts',
    method: 'post',
    data
  })
}

/**
 * 获取告警详情
 */
export function getAlertDetail(id) {
  return request({
    url: `/alerts/${id}`,
    method: 'get'
  })
}

/**
 * 确认告警
 */
export function confirmAlert(id) {
  return request({
    url: `/alerts/${id}/confirm`,
    method: 'put'
  })
}

/**
 * 解决告警
 */
export function resolveAlert(id, data) {
  return request({
    url: `/alerts/${id}/resolve`,
    method: 'put',
    data
  })
}

/**
 * 忽略告警
 */
export function ignoreAlert(id) {
  return request({
    url: `/alerts/${id}/ignore`,
    method: 'put'
  })
}

/**
 * 获取告警统计
 */
export function getAlertStatistics(params) {
  return request({
    url: '/alerts/statistics',
    method: 'get',
    params
  })
}

// ==================== 报表管理接口 ====================

/**
 * 获取报表配置列表
 */
export function getReportConfigs() {
  return request({
    url: '/reports/configs',
    method: 'get'
  })
}

/**
 * 生成报表
 */
export function generateReport(data) {
  return request({
    url: '/reports/generate',
    method: 'post',
    data
  })
}

/**
 * 获取报表生成记录
 */
export function getReportLogs(params) {
  return request({
    url: '/reports/logs',
    method: 'get',
    params
  })
}

/**
 * 下载报表
 */
export function downloadReport(id) {
  return request({
    url: `/reports/download/${id}`,
    method: 'get',
    responseType: 'blob'
  })
}

// ==================== 操作日志接口 ====================

/**
 * 获取操作日志
 */
export function getOperationLogs(params) {
  return request({
    url: '/logs/operations',
    method: 'get',
    params
  })
}

// ==================== 管理端接口 ====================

/**
 * 获取用户列表
 */
export function getUsers(params) {
  return request({
    url: '/admin/users',
    method: 'get',
    params
  })
}

/**
 * 创建用户
 */
export function createUser(data) {
  return request({
    url: '/admin/users',
    method: 'post',
    data
  })
}

/**
 * 更新用户
 */
export function updateUser(id, data) {
  return request({
    url: `/admin/users/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除用户
 */
export function deleteUser(id) {
  return request({
    url: `/admin/users/${id}`,
    method: 'delete'
  })
}

/**
 * 重置密码
 */
export function resetPassword(id, data) {
  return request({
    url: `/admin/users/${id}/reset-password`,
    method: 'put',
    data
  })
}

/**
 * 获取角色列表
 */
export function getRoles(params) {
  return request({
    url: '/admin/roles',
    method: 'get',
    params
  })
}

/**
 * 创建角色
 */
export function createRole(data) {
  return request({
    url: '/admin/roles',
    method: 'post',
    data
  })
}

/**
 * 更新角色
 */
export function updateRole(id, data) {
  return request({
    url: `/admin/roles/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除角色
 */
export function deleteRole(id) {
  return request({
    url: `/admin/roles/${id}`,
    method: 'delete'
  })
}

/**
 * 分配权限
 */
export function assignPermissions(roleId, data) {
  return request({
    url: `/admin/roles/${roleId}/permissions`,
    method: 'put',
    data
  })
}

/**
 * 获取权限列表
 */
export function getPermissions() {
  return request({
    url: '/admin/permissions',
    method: 'get'
  })
}

/**
 * 获取告警规则
 */
export function getAlertRules(params) {
  return request({
    url: '/admin/alert-rules',
    method: 'get',
    params
  })
}

/**
 * 创建告警规则
 */
export function createAlertRule(data) {
  return request({
    url: '/admin/alert-rules',
    method: 'post',
    data
  })
}

/**
 * 更新告警规则
 */
export function updateAlertRule(id, data) {
  return request({
    url: `/admin/alert-rules/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除告警规则
 */
export function deleteAlertRule(id) {
  return request({
    url: `/admin/alert-rules/${id}`,
    method: 'delete'
  })
}

/**
 * 获取报表配置
 */
export function getAdminReportConfigs(params) {
  return request({
    url: '/admin/report-configs',
    method: 'get',
    params
  })
}

/**
 * 创建报表配置
 */
export function createReportConfig(data) {
  return request({
    url: '/admin/report-configs',
    method: 'post',
    data
  })
}

/**
 * 更新报表配置
 */
export function updateReportConfig(id, data) {
  return request({
    url: `/admin/report-configs/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除报表配置
 */
export function deleteReportConfig(id) {
  return request({
    url: `/admin/report-configs/${id}`,
    method: 'delete'
  })
}

// ==================== 设备端接口 ====================

/**
 * 设备认证登录
 */
export function deviceLogin(data) {
  return request({
    url: '/device/auth/login',
    method: 'post',
    data
  })
}

/**
 * 设备心跳
 */
export function deviceHeartbeat(data) {
  return request({
    url: '/device/heartbeat',
    method: 'post',
    data
  })
}

/**
 * 上报设备状态
 */
export function deviceReportStatus(data) {
  return request({
    url: '/device/status',
    method: 'post',
    data
  })
}

/**
 * 获取待执行命令
 */
export function deviceGetPendingCommands(params) {
  return request({
    url: '/device/commands/pending',
    method: 'get',
    params
  })
}

/**
 * 上报命令执行结果
 */
export function deviceReportCommandResult(commandLogId, data) {
  return request({
    url: `/device/commands/${commandLogId}/result`,
    method: 'put',
    data
  })
}

/**
 * 获取配置信息
 */
export function deviceGetConfig(params) {
  return request({
    url: '/device/config',
    method: 'get',
    params
  })
}

/**
 * 确认配置同步
 */
export function deviceConfirmConfigSync(data) {
  return request({
    url: '/device/config/confirm',
    method: 'post',
    data
  })
}

