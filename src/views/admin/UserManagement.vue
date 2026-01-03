<template>
  <div class="user-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-button type="primary" @click="handleAdd">添加用户</el-button>
        </div>
      </template>

      <el-table :data="userList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="realName" label="真实姓名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isAdmin" label="是否管理员" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isAdmin === 1 ? 'danger' : 'info'">
              {{ row.isAdmin === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginTime" label="最后登录" width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleResetPassword(row)">重置密码</el-button>
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

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form ref="userFormRef" :model="userForm" :rules="userRules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch v-model="userForm.status" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="是否管理员" prop="isAdmin">
          <el-switch v-model="userForm.isAdmin" />
        </el-form-item>
        <el-form-item label="头像URL" prop="avatarUrl">
          <el-input v-model="userForm.avatarUrl" />
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
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const userList = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加用户')
const isEdit = ref(false)
const submitting = ref(false)
const userFormRef = ref(null)
const currentUserId = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const userForm = reactive({
  username: '',
  password: '',
  realName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  status: true,
  isAdmin: false
})

const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }]
}

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getUsers(params)
    if (res.code === 1) {
      userList.value = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  dialogTitle.value = '添加用户'
  isEdit.value = false
  currentUserId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  isEdit.value = true
  currentUserId.value = row.id
  Object.assign(userForm, {
    username: row.username,
    password: '',
    realName: row.realName || '',
    email: row.email || '',
    phone: row.phone || '',
    avatarUrl: row.avatarUrl || '',
    status: row.status === 1,
    isAdmin: row.isAdmin === 1
  })
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await deleteUser(row.id)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      loadUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleResetPassword = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'password'
    })
    
    const res = await resetPassword(row.id, { password: value })
    if (res.code === 1) {
      ElMessage.success('密码重置成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密码重置失败')
    }
  }
}

const resetForm = () => {
  Object.assign(userForm, {
    username: '',
    password: '',
    realName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    status: true,
    isAdmin: false
  })
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}

const handleSubmit = async () => {
  if (!userFormRef.value) return
  
  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let res
        if (isEdit.value) {
          const { password, ...updateData } = userForm
          // 接口文档要求status和isAdmin是boolean类型，不需要转换
          res = await updateUser(currentUserId.value, updateData)
        } else {
          // 接口文档要求status和isAdmin是boolean类型，直接使用
          res = await createUser(userForm)
        }
        
        if (res.code === 1) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadUsers()
        }
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleSizeChange = () => {
  loadUsers()
}

const handlePageChange = () => {
  loadUsers()
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

