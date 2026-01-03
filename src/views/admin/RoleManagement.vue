<template>
  <div class="role-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button type="primary" @click="handleAdd">添加角色</el-button>
        </div>
      </template>

      <el-table :data="roleList" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="roleCode" label="角色编码" />
        <el-table-column prop="roleName" label="角色名称" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link @click="handleAssignPermissions(row)">分配权限</el-button>
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

    <!-- 添加/编辑角色对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
    >
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-width="100px">
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="roleForm.roleCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="roleForm.roleName" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="roleForm.status" style="width: 100%">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配权限对话框 -->
    <el-dialog
      v-model="permissionDialogVisible"
      title="分配权限"
      width="600px"
    >
      <el-tree
        ref="permissionTreeRef"
        :data="permissionTree"
        :props="{ children: 'children', label: 'label' }"
        show-checkbox
        node-key="value"
        :default-checked-keys="checkedPermissions"
      />
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPermissions" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getRoles, createRole, updateRole, deleteRole, assignPermissions, getPermissions } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const roleList = ref([])
const permissionTree = ref([])
const dialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const dialogTitle = ref('添加角色')
const isEdit = ref(false)
const submitting = ref(false)
const roleFormRef = ref(null)
const permissionTreeRef = ref(null)
const currentRoleId = ref(null)
const checkedPermissions = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const roleForm = reactive({
  roleCode: '',
  roleName: '',
  description: '',
  status: 1
})

const roleRules = {
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

const loadRoles = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await getRoles(params)
    if (res.code === 1) {
      roleList.value = res.data.rows || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    ElMessage.error('获取角色列表失败')
  } finally {
    loading.value = false
  }
}

const loadPermissions = async () => {
  try {
    const res = await getPermissions()
    if (res.code === 1) {
      // 将权限数据转换为树形结构
      permissionTree.value = transformPermissions(res.data || [])
    }
  } catch (error) {
    ElMessage.error('获取权限列表失败')
  }
}

const transformPermissions = (permissions) => {
  // 将权限数据转换为Element Plus Tree组件需要的格式
  const transform = (items) => {
    return items.map(item => ({
      value: item.id,
      label: item.permissionName,
      children: item.children && item.children.length > 0 ? transform(item.children) : []
    }))
  }
  return transform(permissions)
}

const handleAdd = () => {
  dialogTitle.value = '添加角色'
  isEdit.value = false
  currentRoleId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogTitle.value = '编辑角色'
  isEdit.value = true
  currentRoleId.value = row.id
  Object.assign(roleForm, {
    roleCode: row.roleCode,
    roleName: row.roleName,
    description: row.description || '',
    status: row.status || 1
  })
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除角色 "${row.roleName}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const res = await deleteRole(row.id)
    if (res.code === 1) {
      ElMessage.success('删除成功')
      loadRoles()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleAssignPermissions = async (row) => {
  currentRoleId.value = row.id
  checkedPermissions.value = row.permissionIds || []
  await loadPermissions()
  permissionDialogVisible.value = true
}

const handleSubmit = async () => {
  if (!roleFormRef.value) return
  
  await roleFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let res
        if (isEdit.value) {
          res = await updateRole(currentRoleId.value, roleForm)
        } else {
          res = await createRole(roleForm)
        }
        
        if (res.code === 1) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadRoles()
        }
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleSubmitPermissions = async () => {
  if (!permissionTreeRef.value) return
  
  submitting.value = true
  try {
    const checkedKeys = permissionTreeRef.value.getCheckedKeys()
    const res = await assignPermissions(currentRoleId.value, { permissionIds: checkedKeys })
    if (res.code === 1) {
      ElMessage.success('权限分配成功')
      permissionDialogVisible.value = false
      loadRoles()
    }
  } catch (error) {
    ElMessage.error('权限分配失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  Object.assign(roleForm, {
    roleCode: '',
    roleName: '',
    description: '',
    status: 1
  })
  if (roleFormRef.value) {
    roleFormRef.value.clearValidate()
  }
}

const handleSizeChange = () => {
  loadRoles()
}

const handlePageChange = () => {
  loadRoles()
}

onMounted(() => {
  loadRoles()
  loadPermissions()
})
</script>

<style scoped>
.role-management {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

