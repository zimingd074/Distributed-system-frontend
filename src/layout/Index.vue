<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="layout-aside">
      <div class="logo">
        <h2>门禁监管系统</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="layout-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        
        <el-sub-menu index="/devices">
          <template #title>
            <el-icon><Lock /></el-icon>
            <span>门禁管理</span>
          </template>
          <el-menu-item index="/devices">门禁列表</el-menu-item>
          <el-menu-item index="/devices/test">设备端测试</el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/commands">
          <el-icon><Key /></el-icon>
          <template #title>门禁控制</template>
        </el-menu-item>
        
        <el-menu-item index="/alerts">
          <el-icon><Bell /></el-icon>
          <template #title>
            <span>告警管理</span>
            <el-badge v-if="alertStore.unreadCount > 0" :value="alertStore.unreadCount" class="alert-badge" />
          </template>
        </el-menu-item>
        
        <el-menu-item index="/reports">
          <el-icon><Document /></el-icon>
          <template #title>报表管理</template>
        </el-menu-item>
        
        <el-sub-menu v-if="authStore.isAdmin" index="/admin">
          <template #title>
            <el-icon><User /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/admin/users">用户管理</el-menu-item>
          <el-menu-item index="/admin/roles">角色管理</el-menu-item>
          <el-menu-item index="/admin/alert-rules">告警规则</el-menu-item>
          <el-menu-item index="/admin/report-configs">报表配置</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <NotificationCenter />
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ authStore.userInfo?.username || '用户' }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAlertStore } from '@/stores/alert'
import { ElMessageBox } from 'element-plus'
import { Odometer, Lock, Key, Bell, Document, User, ArrowDown } from '@element-plus/icons-vue'
import NotificationCenter from '@/components/NotificationCenter.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '仪表盘')

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await authStore.logout()
      router.push('/login')
    } catch {
      // 用户取消
    }
  } else if (command === 'profile') {
    // 可以跳转到个人信息页面
    ElMessageBox.alert('个人信息功能待开发', '提示')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: #304156;
  overflow: hidden;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  background-color: #2b3a4a;
  color: #fff;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  font-weight: normal;
}

.layout-menu {
  border: none;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.alert-badge {
  margin-left: 5px;
}

.layout-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.layout-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>

