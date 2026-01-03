import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

// 创建axios实例
// 开发环境使用相对路径，通过Vite代理转发；生产环境使用完整URL
const baseURL = import.meta.env.DEV 
  ? '/api'  // 开发环境使用代理
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api')  // 生产环境使用配置的URL

const service = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false  // 根据后端CORS配置决定是否发送cookie
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const authStore = useAuthStore()
    const token = authStore.accessToken || localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果返回的状态码不是1，则判断为错误
    if (res.code !== undefined && res.code !== 1) {
      ElMessage.error(res.msg || '请求失败')
      
      // 401: Token过期或无效
      if (res.code === 401) {
        const authStore = useAuthStore()
        authStore.logout()
      }
      
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    
    return res
  },
  error => {
    console.error('响应错误:', error)
    let message = '请求失败'
    
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未认证或Token无效'
          const authStore = useAuthStore()
          authStore.logout()
          break
        case 403:
          message = '权限不足'
          break
        case 404:
          message = '资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = error.response.data?.msg || `请求失败: ${error.response.status}`
      }
    } else if (error.request) {
      message = '网络连接失败，请检查网络'
    }
    
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service

