import React, { useEffect, useMemo, useState } from 'react'
import { getCurrentUser } from '../store/users'
import * as XLSX from 'xlsx'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  uploadProjectAttachments,
  listMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  importMaterialsBatch,
  exportMaterialsXlsx,
  searchMaterials,
  deleteMaterialsBatch
} from '../store/projects'
import { getApiBase } from '../store/api'
import { 
  FolderOpen,
  AttachMoney,
  TrendingDown,
  CreditCard,
  Description,
  ChevronRight,
  Close,
  PieChart,
  Home,
  Edit,
  Delete,
  Add,
  Search,
  Download,
  Upload,
  Check,
  Clear
} from '@mui/icons-material'

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

const API_BASE = getApiBase()

function authHeaders(base = {}) {
  const u = getCurrentUser()
  const token = u?.token
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

// 供应商合同API函数
async function getSupplierContracts(projectId = null, includeArchived = false) {
  let url = `${API_BASE}/supplier-contracts`
  const params = new URLSearchParams()
  
  if (projectId) {
    params.append('projectId', projectId)
  }
  
  if (includeArchived) {
    params.append('includeArchived', 'true')
  }
  
  if (params.toString()) {
    url += '?' + params.toString()
  }
  
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error('获取合同失败')
  return res.json()
}

async function createSupplierContract(data) {
  // 检查data是否为FormData
  const isFormData = data instanceof FormData
  
  const res = await fetch(`${API_BASE}/supplier-contracts`, {
    method: 'POST',
    headers: isFormData ? authHeaders() : authHeaders({ 'Content-Type': 'application/json' }),
    body: isFormData ? data : JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '创建合同失败')
  }
  return res.json()
}

async function updateSupplierContract(id, data) {
  // 检查data是否为FormData
  const isFormData = data instanceof FormData
  
  const res = await fetch(`${API_BASE}/supplier-contracts/${id}`, {
    method: 'PUT',
    headers: isFormData ? authHeaders() : authHeaders({ 'Content-Type': 'application/json' }),
    body: isFormData ? data : JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '更新合同失败')
  }
  return res.json()
}

async function deleteSupplierContract(id) {
  const res = await fetch(`${API_BASE}/supplier-contracts/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '删除合同失败')
  }
  return res.json()
}

async function archiveSupplierContract(id) {
  const res = await fetch(`${API_BASE}/supplier-contracts/${id}/archive`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '归档合同失败')
  }
  return res.json()
}

async function approveContract(id, approved, comments = '') {
  const res = await fetch(`${API_BASE}/supplier-contracts/${id}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ approved, comments })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '审批失败')
  }
  return res.json()
}

// 提交审批API函数
async function submitForApproval(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/submit`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '提交审批失败')
  }
  return res.json()
}

// 项目审批API函数
async function approveProject(projectId, approved, comments = '') {
  const res = await fetch(`${API_BASE}/projects/${projectId}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ approved, comments })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '审批失败')
  }
  return res.json()
}

// 获取项目变更记录
async function getProjectChanges(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/changes`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error('获取变更记录失败')
  return res.json()
}

function ProjectDrawer({ isOpen, onClose, mode, initialData, onSubmit, onDelete, onApprove, onSubmitApproval }) {
    const [formData, setFormData] = useState(initialData || {})
    const [contractFile, setContractFile] = useState(null)
    const [attachments, setAttachments] = useState([])
    const user = getCurrentUser()

    useEffect(() => {
        setFormData(initialData || {})
        setContractFile(null)
        setAttachments([])
    }, [initialData, isOpen])

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData, contractFile, attachments)
    }

    const handleSubmitApproval = async () => {
        if (!confirm('确定要提交审批吗？提交后将无法修改项目信息。')) return
        
        try {
            await onSubmitApproval(formData.id)
        } catch (e) {
            alert(e.message)
        }
    }

    const handleApprove = async (approved) => {
        const comments = prompt(approved ? '请输入审批意见（可选）:' : '请输入拒绝原因:')
        if (comments === null) return
        
        try {
            await onApprove(formData.id, approved, comments)
        } catch (e) {
            alert(e.message)
        }
    }

    const isView = mode === 'view'
    const isEdit = mode === 'edit'
    const isCreate = mode === 'create'
    const title = isCreate ? '新建项目' : (isEdit ? '编辑项目' : '项目详情')
    
    const canApprove = ['chairman', 'gm', 'admin'].includes(user?.role) && 
                      (formData.approvalStatus === 'draft' || formData.approvalStatus === 'pending') && 
                      isView

    const canSubmitApproval = user?.role === 'project_manager' && 
                             formData.approvalStatus === 'draft' && 
                             isView

    const getApprovalStatusText = (status) => {
        const map = {
            'draft': '草稿',
            'pending': '待审批', 
            'approved': '已通过',
            'rejected': '已拒绝'
        }
        return map[status] || status
    }

    const getApprovalStatusColor = (status) => {
        const map = {
            'draft': 'text-gray-600 bg-gray-50',
            'pending': 'text-yellow-600 bg-yellow-50',
            'approved': 'text-green-600 bg-green-50',
            'rejected': 'text-red-600 bg-red-50'
        }
        return map[status] || 'text-gray-600 bg-gray-50'
    }

    const getApprovalStatusBadgeClass = (status) => {
        const map = {
            'draft': 'badge-info',
            'pending': 'badge-warning',
            'approved': 'badge-success',
            'rejected': 'badge-danger'
        }
        return map[status] || 'badge-info'
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end transition-opacity">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto transform transition-transform duration-300 ease-in-out">
                <div className="modern-card p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10 rounded-none">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                        {formData.approvalStatus && (
                            <span className={`modern-badge ${getApprovalStatusBadgeClass(formData.approvalStatus)}`}>
                                {getApprovalStatusText(formData.approvalStatus)}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <Close sx={{ fontSize: 24 }} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">项目名称 *</span>
                                <input 
                                    className="modern-input w-full" 
                                    value={formData.name || ''} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    disabled={isView}
                                    required
                                    placeholder="请输入项目名称"
                                />
                            </label>

                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">客户名称 *</span>
                                <input 
                                    className="modern-input w-full" 
                                    value={formData.client || ''} 
                                    onChange={e => setFormData({...formData, client: e.target.value})} 
                                    disabled={isView}
                                    required
                                    placeholder="请输入客户名称"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">合同编号</span>
                                <input 
                                    className="modern-input w-full" 
                                    value={formData.contractNo || ''} 
                                    onChange={e => setFormData({...formData, contractNo: e.target.value})} 
                                    disabled={isView}
                                    placeholder="请输入合同编号"
                                />
                            </label>

                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">项目工期</span>
                                <input 
                                    className="modern-input w-full" 
                                    value={formData.duration || ''} 
                                    onChange={e => setFormData({...formData, duration: e.target.value})} 
                                    disabled={isView}
                                    placeholder="如：12个月"
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">总预算 (元) *</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="modern-input w-full" 
                                    value={formData.totalBudget || ''} 
                                    onChange={e => setFormData({...formData, totalBudget: e.target.value})} 
                                    disabled={isView}
                                    required
                                    placeholder="请输入总预算金额"
                                />
                            </label>

                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">结算金额 (元)</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    className="modern-input w-full" 
                                    value={formData.settlementAmount || ''} 
                                    onChange={e => setFormData({...formData, settlementAmount: e.target.value})} 
                                    disabled={isView}
                                    placeholder="请输入结算金额"
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-gray-700 font-semibold mb-2 block">付款方式</span>
                            <input 
                                className="modern-input w-full" 
                                value={formData.paymentMethod || ''} 
                                onChange={e => setFormData({...formData, paymentMethod: e.target.value})} 
                                disabled={isView}
                                placeholder="如：分期付款、一次性付款等"
                            />
                        </label>

                        <label className="block">
                            <span className="text-gray-700 font-semibold mb-2 block">工程概况</span>
                            <textarea 
                                className="modern-input w-full h-24 resize-none" 
                                value={formData.projectOverview || ''} 
                                onChange={e => setFormData({...formData, projectOverview: e.target.value})} 
                                disabled={isView}
                                placeholder="请描述项目的基本情况、主要内容和目标"
                            />
                        </label>

                        <label className="block">
                            <span className="text-gray-700 font-semibold mb-2 block">客户财务信息</span>
                            <textarea 
                                className="modern-input w-full h-20 resize-none" 
                                value={formData.clientFinancialInfo || ''} 
                                onChange={e => setFormData({...formData, clientFinancialInfo: e.target.value})} 
                                disabled={isView}
                                placeholder="开户行、账号等财务信息"
                            />
                        </label>

                        <label className="block">
                            <span className="text-gray-700 font-semibold mb-2 block">开票信息</span>
                            <textarea 
                                className="modern-input w-full h-20 resize-none" 
                                value={formData.invoiceInfo || ''} 
                                onChange={e => setFormData({...formData, invoiceInfo: e.target.value})} 
                                disabled={isView}
                                placeholder="发票类型、税率等开票信息"
                            />
                        </label>

                        {!isCreate && (
                            <label className="block">
                                <span className="text-gray-700 font-semibold mb-2 block">项目编码</span>
                                <input 
                                    className="modern-input w-full bg-gray-100" 
                                    value={formData.code || ''} 
                                    disabled
                                    placeholder="系统自动生成"
                                />
                                <p className="text-xs text-gray-500 mt-1">项目编码由系统自动生成，格式：HN-年-月-日-序号</p>
                            </label>
                        )}

                        {!isView && (
                            <>
                                <label className="block">
                                    <span className="text-gray-700 font-semibold mb-2 block">项目合同附件</span>
                                    <input 
                                        type="file" 
                                        onChange={e=>setContractFile(e.target.files[0])} 
                                        className="modern-input w-full" 
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">支持 PDF、Word、图片格式</p>
                                </label>
                                {isCreate && (
                                    <label className="block">
                                        <span className="text-gray-700 font-semibold mb-2 block">其他附件 (批量)</span>
                                        <input 
                                            type="file" 
                                            multiple 
                                            onChange={e=>setAttachments([...e.target.files])} 
                                            className="modern-input w-full" 
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">可选择多个文件</p>
                                    </label>
                                )}
                            </>
                        )}

                        {isView && formData.contractFileUrl && (
                            <div className="bg-blue-50 rounded-lg p-4">
                                <span className="text-gray-700 font-semibold">合同附件: </span>
                                <a 
                                    href={formData.contractFileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 underline hover:text-blue-800 transition-colors"
                                >
                                    查看/下载合同文件
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex gap-3">
                        {!isView && (
                            <>
                                <button type="submit" className="modern-btn flex-1">
                                    {isCreate ? '创建项目' : '保存修改'}
                                </button>
                                {isEdit && onDelete && (
                                    <button type="button" onClick={onDelete} className="modern-btn modern-btn-secondary">
                                        删除项目
                                    </button>
                                )}
                            </>
                        )}
                        
                        {canSubmitApproval && (
                            <button type="button" onClick={handleSubmitApproval} className="modern-btn modern-btn-success flex-1">
                                提交审批
                            </button>
                        )}
                        
                        {canApprove && (
                            <>
                                <button type="button" onClick={() => handleApprove(true)} className="modern-btn modern-btn-success flex-1">
                                    审批通过
                                </button>
                                <button type="button" onClick={() => handleApprove(false)} className="modern-btn modern-btn-secondary flex-1">
                                    审批拒绝
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}

// 项目统计图表组件
function ProjectCharts({ projects, selectedProject }) {
  // 项目状态分布数据
  const statusData = {
    labels: ['草稿', '待审批', '已通过', '已拒绝'],
    datasets: [{
      data: [
        projects.filter(p => p.approvalStatus === 'draft').length,
        projects.filter(p => p.approvalStatus === 'pending').length,
        projects.filter(p => p.approvalStatus === 'approved').length,
        projects.filter(p => p.approvalStatus === 'rejected').length,
      ],
      backgroundColor: ['#9CA3AF', '#F59E0B', '#10B981', '#EF4444'],
      borderWidth: 0
    }]
  }

  // 项目预算分布数据
  const budgetData = {
    labels: projects.map(p => p.name),
    datasets: [{
      label: '合同金额 (万元)',
      data: projects.map(p => (Number(p.totalBudget) || 0) / 10000),
      backgroundColor: '#3B82F6',
      borderColor: '#1D4ED8',
      borderWidth: 1
    }]
  }

  // 单个项目详细数据
  const singleProjectData = selectedProject ? {
    labels: ['合同金额', '已花费', '项目余额'],
    datasets: [{
      data: [
        Number(selectedProject.totalBudget) || 0,
        (Number(selectedProject.totalBudget) || 0) - (Number(selectedProject.balance) || 0),
        Number(selectedProject.balance) || 0
      ],
      backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
      borderWidth: 0
    }]
  } : null

  // 项目进度趋势数据（模拟数据）
  const trendData = selectedProject ? {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [{
      label: '累计支出 (万元)',
      data: [0, 10, 25, 45, 70, 85], // 模拟数据
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: true
    }, {
      label: '预算进度 (万元)',
      data: [0, 15, 30, 50, 75, 100], // 模拟数据
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    }]
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right'
      }
    }
  }

  return (
    <div className="space-y-6">
      {selectedProject ? (
        // 单个项目详细图表
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              项目详情: {selectedProject.name}
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 项目资金分布 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">资金分布</h4>
                <div className="h-64">
                  <Doughnut data={singleProjectData} options={pieOptions} />
                </div>
              </div>

              {/* 项目进度趋势 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">支出趋势</h4>
                <div className="h-64">
                  <Line data={trendData} options={chartOptions} />
                </div>
              </div>
            </div>

            {/* 项目关键指标 */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ¥{Number(selectedProject.totalBudget || 0).toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">合同金额</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  ¥{((Number(selectedProject.totalBudget) || 0) - (Number(selectedProject.balance) || 0)).toLocaleString()}
                </div>
                <div className="text-sm text-red-700">已花费</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  ¥{Number(selectedProject.balance || 0).toLocaleString()}
                </div>
                <div className="text-sm text-green-700">项目余额</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {selectedProject.totalBudget ? Math.round(((Number(selectedProject.totalBudget) - Number(selectedProject.balance || 0)) / Number(selectedProject.totalBudget)) * 100) : 0}%
                </div>
                <div className="text-sm text-purple-700">执行进度</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 整体项目统计图表
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 项目状态分布 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">项目状态分布</h3>
            <div className="h-64">
              <Doughnut data={statusData} options={pieOptions} />
            </div>
          </div>

          {/* 项目预算对比 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">项目预算对比</h3>
            <div className="h-64">
              <Bar data={budgetData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 总经理/董事长总览组件
function ExecutiveOverview({ projects, onSelectProject, selectedProject, onDeselectProject }) {
  // 计算总览数据
  const projectCount = projects.length
  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.totalBudget) || 0), 0)
  const totalBalance = projects.reduce((sum, p) => sum + (Number(p.balance) || 0), 0)
  const totalSpent = totalBudget - totalBalance

  const getStatusColor = (status) => {
    const map = {
      'draft': 'text-gray-600 bg-gray-50',
      'pending': 'text-yellow-600 bg-yellow-50',
      'approved': 'text-green-600 bg-green-50',
      'rejected': 'text-red-600 bg-red-50'
    }
    return map[status] || 'text-gray-600 bg-gray-50'
  }

  const getStatusText = (status) => {
    const map = {
      'draft': '草稿',
      'pending': '待审批',
      'approved': '已通过',
      'rejected': '已拒绝'
    }
    return map[status] || status
  }

  const getStatusBadgeClass = (status) => {
    const map = {
      'draft': 'badge-info',
      'pending': 'badge-warning',
      'approved': 'badge-success',
      'rejected': 'badge-danger'
    }
    return map[status] || 'badge-info'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 pb-20">
      {/* 返回按钮 */}
      {selectedProject && (
        <div className="modern-card p-4 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <button 
              onClick={onDeselectProject}
              className="modern-btn-secondary flex items-center gap-2"
            >
              <ChevronRight sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />
              返回总览
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedProject.name} - 详细分析
            </h2>
          </div>
        </div>
      )}

      {/* 项目统计图表 */}
      <div className="mb-6">
        <ProjectCharts projects={projects} selectedProject={selectedProject} />
      </div>

      {!selectedProject && (
        <>
          {/* 总览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="modern-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">项目总数</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{projectCount}</p>
                  <p className="text-xs text-blue-500 mt-1">个活跃项目</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <PieChart sx={{ fontSize: 28 }} className="text-white" />
                </div>
              </div>
            </div>

            <div className="modern-card p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">项目总额</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">¥{totalBudget.toLocaleString()}</p>
                  <p className="text-xs text-green-500 mt-1">总预算金额</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                  <AttachMoney sx={{ fontSize: 28 }} className="text-white" />
                </div>
              </div>
            </div>

            <div className="modern-card p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">已花费</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">¥{totalSpent.toLocaleString()}</p>
                  <p className="text-xs text-red-500 mt-1">累计支出</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                  <TrendingDown sx={{ fontSize: 28 }} className="text-white" />
                </div>
              </div>
            </div>

            <div className="modern-card p-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">项目余额</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">¥{totalBalance.toLocaleString()}</p>
                  <p className="text-xs text-purple-500 mt-1">可用余额</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                  <CreditCard sx={{ fontSize: 28 }} className="text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* 项目列表 */}
          <div className="modern-card animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">项目列表</h2>
                  <p className="text-sm text-gray-600 mt-1">点击项目查看详细分析和管理</p>
                </div>
                <div className="flex gap-3">
                  <button className="modern-btn-success flex items-center gap-2">
                    <Add sx={{ fontSize: 16 }} />
                    新建项目
                  </button>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {projects.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Description sx={{ fontSize: 40 }} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无项目</h3>
                  <p className="text-gray-500 mb-6">开始创建您的第一个项目</p>
                  <button className="modern-btn flex items-center gap-2 mx-auto">
                    <Add sx={{ fontSize: 16 }} />
                    创建项目
                  </button>
                </div>
              ) : (
                projects.map((project, index) => (
                  <div 
                    key={project.id} 
                    className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all duration-300 group"
                    onClick={() => onSelectProject(project)}
                    style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                            {project.name}
                          </h3>
                          <span className={`modern-badge ${getStatusBadgeClass(project.approvalStatus)}`}>
                            {getStatusText(project.approvalStatus)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">项目编号:</span>
                            <span className="ml-2 font-medium text-gray-700">{project.code}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">客户:</span>
                            <span className="ml-2 font-medium text-gray-700">{project.client}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">预算:</span>
                            <span className="ml-2 font-medium text-green-600">¥{project.totalBudget?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">余额:</span>
                            <span className="ml-2 font-medium text-blue-600">¥{project.balance?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                        <ChevronRight sx={{ fontSize: 24 }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                          <span className="text-sm text-gray-500">({project.code})</span>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(project.approvalStatus)}`}>
                            {getStatusText(project.approvalStatus)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">甲方单位:</span>
                            <span className="ml-2 text-gray-900">{project.client || '-'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">合同金额:</span>
                            <span className="ml-2 text-gray-900 font-medium">¥{Number(project.totalBudget || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">项目余额:</span>
                            <span className="ml-2 text-gray-900 font-medium">¥{Number(project.balance || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {project.projectOverview && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="text-gray-600">工程概况:</span>
                            <span className="ml-2">{project.projectOverview}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-gray-400">
                        <ChevronRight sx={{ fontSize: 20 }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// 合同表单组件
function ContractForm({ contract, projects, currentProjectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(contract || {
    projectId: currentProjectId || '',
    contractNo: '',
    contractName: '',
    supplierId: '',
    supplierName: '',
    contractAmount: '',
    paymentMethod: '',
    contractFile: null
  })
  
  const [suppliers, setSuppliers] = useState([])
  const [materialList, setMaterialList] = useState([])
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    specification: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    totalPrice: 0,
    remarks: '',
    category: '材料清单' // 新增材料类别字段
  })
  
  // 智能查询相关状态
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 初始化合同数据（编辑时）
  useEffect(() => {
    if (contract) {
      setFormData(contract)
      // 初始化材料清单
      if (contract.materialList) {
        try {
          const materials = typeof contract.materialList === 'string' 
            ? JSON.parse(contract.materialList) 
            : contract.materialList
          setMaterialList(Array.isArray(materials) ? materials : [])
        } catch (e) {
          console.error('解析合同材料清单失败:', e)
          setMaterialList([])
        }
      }
    } else {
      // 新建合同时重置
      setFormData({
        projectId: currentProjectId || '',
        contractNo: '',
        contractName: '',
        supplierId: '',
        supplierName: '',
        contractAmount: '',
        paymentMethod: '',
        contractFile: null
      })
      setMaterialList([])
    }
  }, [contract, currentProjectId])

  // 加载供应商列表
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await fetch(`${API_BASE}/suppliers`, { headers: authHeaders() })
        if (res.ok) {
          const data = await res.json()
          setSuppliers(data)
        }
      } catch (e) {
        console.error('加载供应商失败:', e)
      }
    }
    loadSuppliers()
  }, [])

  // 材料智能查询
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (showSuggestions && newMaterial.name) {
        try {
          const results = await searchMaterials(newMaterial.name)
          setSuggestions(results)
        } catch(e) { 
          console.error('搜索材料失败:', e)
          setSuggestions([])
        }
      } else {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [newMaterial.name, showSuggestions])

  // 处理智能查询建议选择
  const handleSelectSuggestion = (item) => {
    setNewMaterial(prev => ({
      ...prev,
      name: item.name,
      specification: item.specification || '',
      unit: item.unit || '',
      unitPrice: item.unitPrice || '',
      totalPrice: Number(prev.quantity || 0) * Number(item.unitPrice || 0),
      remarks: prev.remarks // 保留用户输入的备注
    }))
    setShowSuggestions(false)
  }

  // 当选择项目时，自动填充项目信息
  const handleProjectChange = (projectId) => {
    const selectedProject = projects.find(p => p.id === projectId)
    setFormData(prev => ({
      ...prev,
      projectId,
      projectName: selectedProject?.name || '',
      projectCode: selectedProject?.code || ''
    }))
  }

  // 当选择供应商时，自动填充供应商信息
  const handleSupplierChange = (supplierId) => {
    const selectedSupplier = suppliers.find(s => s.id === supplierId)
    setFormData(prev => ({
      ...prev,
      supplierId,
      supplierName: selectedSupplier?.name || ''
    }))
  }

  // 添加材料到清单并同步到项目材料清单
  const addMaterialToContract = async () => {
    if (!newMaterial.name || !newMaterial.quantity || !newMaterial.unitPrice) {
      alert('请填写材料名称、数量和单价')
      return
    }

    if (!formData.projectId) {
      alert('请先选择关联项目')
      return
    }

    const material = {
      ...newMaterial,
      id: Date.now().toString(),
      totalPrice: Number(newMaterial.quantity) * Number(newMaterial.unitPrice)
    }

    // 添加到合同材料清单
    setMaterialList(prev => [...prev, material])

    // 同步添加到项目材料清单
    try {
      console.log('开始同步材料到项目:', {
        projectId: formData.projectId,
        materialName: material.name,
        category: material.category,
        supplierName: formData.supplierName
      })
      
      const result = await addMaterial(formData.projectId, {
        name: String(material.name || ''),
        specification: String(material.specification || ''),
        unit: String(material.unit || ''),
        quantity: Number(material.quantity || 0),
        unitPrice: Number(material.unitPrice || 0),
        totalPrice: Number(material.totalPrice || 0),
        remarks: String(material.remarks || ''),
        supplier: formData.supplierName || '', // 使用选中的供应商名称
        type: material.category // 使用选择的材料类别
      })
      
      console.log('材料同步成功:', result)
      alert(`材料已成功添加到项目${material.category}`)
    } catch (e) {
      console.error('同步材料到项目失败:', e)
      alert(`材料添加到合同成功，但同步到项目${material.category}失败: ${e.message}`)
      // 即使同步失败，也保留在合同清单中
    }

    // 重置表单
    setNewMaterial({
      name: '',
      specification: '',
      unit: '',
      quantity: '',
      unitPrice: '',
      totalPrice: 0,
      remarks: '',
      category: '材料清单'
    })
  }

  // 删除材料
  const removeMaterial = (id) => {
    setMaterialList(prev => prev.filter(m => m.id !== id))
  }

  // 计算材料总价
  const calculateMaterialTotal = () => {
    return materialList.reduce((sum, material) => sum + Number(material.totalPrice), 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.projectId || !formData.contractName || 
        !formData.supplierId || !formData.contractAmount) {
      alert('请填写所有必填字段')
      return
    }

    const submitData = {
      ...formData,
      materialList: materialList
    }

    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-bold">{contract?.id ? '编辑合同' : '新建采购合同'}</h3>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 项目信息 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-blue-800 mb-3">项目信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-700 font-medium">关联项目 *</span>
                <select 
                  className="input w-full mt-1" 
                  value={formData.projectId} 
                  onChange={e => handleProjectChange(e.target.value)}
                  required
                >
                  <option value="">请选择项目</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </label>
              
              {formData.projectId && (
                <div className="flex flex-col justify-end">
                  <span className="text-sm text-gray-600">项目编号: {formData.projectCode}</span>
                  <span className="text-sm text-gray-600">项目名称: {formData.projectName}</span>
                </div>
              )}
            </div>
          </div>

          {/* 合同基本信息 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-green-800 mb-3">合同信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-700 font-medium">合同编号</span>
                <input 
                  className="input w-full mt-1 bg-gray-100" 
                  value={formData.contractNo || ''} 
                  disabled
                  placeholder="系统自动生成"
                />
                <p className="text-xs text-gray-500 mt-1">合同编号由系统自动生成，格式：HN-CG-年-月-日-序号</p>
              </label>
              
              <label className="block">
                <span className="text-gray-700 font-medium">合同名称 *</span>
                <input 
                  className="input w-full mt-1" 
                  value={formData.contractName} 
                  onChange={e => setFormData({...formData, contractName: e.target.value})}
                  placeholder="如：材料采购合同"
                  required
                />
              </label>
            </div>
          </div>

          {/* 供应商信息 */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-purple-800 mb-3">供应商信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-700 font-medium">供应商 *</span>
                <select 
                  className="input w-full mt-1" 
                  value={formData.supplierId} 
                  onChange={e => handleSupplierChange(e.target.value)}
                  required
                >
                  <option value="">请选择供应商</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              
              {formData.supplierId && (
                <div className="flex flex-col justify-end">
                  <span className="text-sm text-gray-600">
                    供应商: {formData.supplierName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 合同金额和付款方式 */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-yellow-800 mb-3">财务信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-700 font-medium">合同金额 (元) *</span>
                <input 
                  type="number"
                  step="0.01"
                  className="input w-full mt-1" 
                  value={formData.contractAmount} 
                  onChange={e => setFormData({...formData, contractAmount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </label>
              
              <div className="flex flex-col justify-end">
                <span className="text-sm text-gray-600">
                  材料清单总额: ¥{calculateMaterialTotal().toLocaleString()}
                </span>
              </div>
            </div>
            
            <label className="block mt-4">
              <span className="text-gray-700 font-medium">付款方式</span>
              <textarea 
                className="input w-full mt-1 h-20" 
                value={formData.paymentMethod} 
                onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                placeholder="如：预付30%，发货后70%"
              />
            </label>
          </div>

          {/* 材料清单 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-gray-800">采购清单</h4>
              <div className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                <span className="font-medium">🔄 智能同步:</span> 添加的材料将自动同步到项目对应的材料清单中
              </div>
            </div>
            
            {/* 添加材料表单 */}
            <div className="space-y-3 mb-4 p-3 bg-white rounded border">
              {/* 第一行：材料类别选择 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-gray-700 font-medium text-sm">材料类别 *</span>
                  <select
                    className="input text-sm mt-1"
                    value={newMaterial.category}
                    onChange={e => setNewMaterial({...newMaterial, category: e.target.value})}
                  >
                    <option value="材料清单">材料清单</option>
                    <option value="施工清单">施工清单</option>
                    <option value="调试清单">调试清单</option>
                  </select>
                </label>
                <div className="md:col-span-2 flex items-end">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    💡 选择的材料类别将同步到项目的对应清单中
                  </span>
                </div>
              </div>
              
              {/* 第二行：材料基本信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="relative">
                  <input
                    className="input text-sm"
                    placeholder="材料名称 * (输入搜索)"
                    value={newMaterial.name}
                    onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-80 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 left-0">
                      {suggestions.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-3 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(item); }}
                        >
                          <div className="font-bold text-gray-800 mb-1">{item.name}</div>
                          <div className="text-gray-500 space-y-1">
                            <div>规格: {item.specification || '-'}</div>
                            <div className="flex gap-3">
                              <span>单位: {item.unit || '-'}</span>
                              <span>单价: ¥{item.unitPrice || '-'}</span>
                              <span>供应商: {item.supplier || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  className="input text-sm"
                  placeholder="规格"
                  value={newMaterial.specification}
                  onChange={e => setNewMaterial({...newMaterial, specification: e.target.value})}
                />
                <input
                  className="input text-sm"
                  placeholder="单位"
                  value={newMaterial.unit}
                  onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}
                />
                <input
                  className="input text-sm"
                  type="number"
                  placeholder="数量 *"
                  value={newMaterial.quantity}
                  onChange={e => {
                    const quantity = e.target.value
                    const totalPrice = Number(quantity) * Number(newMaterial.unitPrice)
                    setNewMaterial({...newMaterial, quantity, totalPrice})
                  }}
                />
                <input
                  className="input text-sm"
                  type="number"
                  step="0.01"
                  placeholder="单价 *"
                  value={newMaterial.unitPrice}
                  onChange={e => {
                    const unitPrice = e.target.value
                    const totalPrice = Number(newMaterial.quantity) * Number(unitPrice)
                    setNewMaterial({...newMaterial, unitPrice, totalPrice})
                  }}
                />
                <input
                  className="input text-sm bg-gray-100"
                  placeholder="总价"
                  value={newMaterial.totalPrice.toFixed(2)}
                  readOnly
                />
                <button
                  type="button"
                  onClick={addMaterialToContract}
                  className="btn bg-blue-600 text-white text-sm px-2"
                >
                  添加
                </button>
              </div>
              
              {/* 第三行：备注 */}
              <div className="grid grid-cols-1 gap-2">
                <input
                  className="input text-sm"
                  placeholder="备注（可选）"
                  value={newMaterial.remarks}
                  onChange={e => setNewMaterial({...newMaterial, remarks: e.target.value})}
                />
              </div>
            </div>

            {/* 材料清单列表 */}
            {materialList.length > 0 && (
              <>
                {/* 材料分类统计 */}
                <div className="mb-4 p-3 bg-blue-50 rounded border">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">材料分类统计</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {['材料清单', '施工清单', '调试清单'].map(category => {
                      const categoryMaterials = materialList.filter(m => m.category === category)
                      const categoryTotal = categoryMaterials.reduce((sum, m) => sum + Number(m.totalPrice), 0)
                      return (
                        <div key={category} className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            category === '材料清单' ? 'bg-blue-100 text-blue-700' :
                            category === '施工清单' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {category}
                          </span>
                          <span className="font-medium">
                            {categoryMaterials.length}项 / ¥{categoryTotal.toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">类别</th>
                      <th className="p-2 text-left">材料名称</th>
                      <th className="p-2 text-left">规格</th>
                      <th className="p-2 text-left">单位</th>
                      <th className="p-2 text-right">数量</th>
                      <th className="p-2 text-right">单价</th>
                      <th className="p-2 text-right">总价</th>
                      <th className="p-2 text-left">备注</th>
                      <th className="p-2 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialList.map((material) => (
                      <tr key={material.id} className="border-b">
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            material.category === '材料清单' ? 'bg-blue-100 text-blue-700' :
                            material.category === '施工清单' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {material.category}
                          </span>
                        </td>
                        <td className="p-2">{material.name}</td>
                        <td className="p-2">{material.specification}</td>
                        <td className="p-2">{material.unit}</td>
                        <td className="p-2 text-right">{material.quantity}</td>
                        <td className="p-2 text-right">¥{Number(material.unitPrice).toFixed(2)}</td>
                        <td className="p-2 text-right font-medium">¥{Number(material.totalPrice).toFixed(2)}</td>
                        <td className="p-2">{material.remarks}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeMaterial(material.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan="6" className="p-2 text-right font-medium">合计:</td>
                      <td className="p-2 text-right font-bold">¥{calculateMaterialTotal().toFixed(2)}</td>
                      <td colSpan="2" className="p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              </>
            )}
          </div>

          {/* 合同文件上传 */}
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-orange-800 mb-3">合同文件</h4>
            <label className="block">
              <span className="text-gray-700 font-medium">上传合同文件</span>
              <input 
                type="file" 
                className="input w-full mt-1"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => setFormData({...formData, contractFile: e.target.files[0]})}
              />
              <p className="text-xs text-gray-500 mt-1">支持 PDF、Word、图片格式</p>
            </label>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn bg-gray-200 text-gray-800">
            取消
          </button>
          <button type="submit" className="btn bg-blue-600 text-white">
            {contract?.id ? '更新合同' : '创建合同'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Projects() {
  const user = getCurrentUser()
  const [projects, setProjects] = useState([])
  const [newProj, setNewProj] = useState({ name: '', code: '', client: '', contractNo: '', totalBudget: '', duration: '', clientFinancialInfo: '' })
  const [editingId, setEditingId] = useState(null)
  const [currentProjectId, setCurrentProjectId] = useState(null)
  
  // 材料清单相关状态（采购经理使用）
  const [materials, setMaterials] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newFormByType, setNewFormByType] = useState({ '材料清单': {}, '施工清单': {}, '调试清单': {} })
  const [suggestions, setSuggestions] = useState([])
  const [activeSuggestionType, setActiveSuggestionType] = useState(null)
  
  // 高管选中的项目（用于图表显示）
  const [selectedProjectForCharts, setSelectedProjectForCharts] = useState(null)
  
  // 标签页状态
  const [activeTab, setActiveTab] = useState('info') // 'info', 'materials', 'contracts'
  
  // 采购合同相关状态
  const [contracts, setContracts] = useState([])
  const [showContractForm, setShowContractForm] = useState(false)
  const [editingContract, setEditingContract] = useState(null)
  const [showArchivedContracts, setShowArchivedContracts] = useState(false)
  
  // Drawer state
  const [showProjectDrawer, setShowProjectDrawer] = useState(false)
  const [projectDrawerMode, setProjectDrawerMode] = useState('view') // 'view', 'edit', 'create'

  const role = String(user?.role || '')
  const isPM = role === 'project_manager'
  const isProcurement = role === 'procurement_manager'
  const isGM = role === 'gm' // 总经理
  const isChairman = role === 'chairman' // 董事长

  useEffect(() => {
    loadProjectsData()
  }, [])

  // 加载项目数据
  const loadProjectsData = async () => {
    try {
      const list = await listProjects()
      setProjects(list)
      console.log('项目数据已刷新:', list.map(p => ({ name: p.name, code: p.code })))
    } catch (e) { 
      console.error('加载项目数据失败:', e) 
    }
  }

  // 材料搜索自动完成
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (activeSuggestionType && isProcurement) {
            const name = newFormByType[activeSuggestionType]?.name
            if (name) {
                try {
                    const results = await searchMaterials(name)
                    setSuggestions(results)
                } catch(e) { console.error(e) }
            } else {
                setSuggestions([])
            }
        }
    }, 300)
    return () => clearTimeout(timer)
  }, [newFormByType, activeSuggestionType, isProcurement])

  const handleProjectChange = async (pid) => {
      setCurrentProjectId(pid)
      if (isProcurement && pid) {
          await loadProjectMaterials(pid)
          setSelectedIds(new Set())
      }
      if (pid) {
          await loadProjectContracts(pid)
      }
  }

  // 监听归档状态变化，重新加载合同
  useEffect(() => {
    if (currentProjectId) {
      loadProjectContracts(currentProjectId)
    }
  }, [showArchivedContracts])

  // 加载项目合同
  const loadProjectContracts = async (pid) => {
    try {
      const contractsData = await getSupplierContracts(pid, showArchivedContracts)
      setContracts(contractsData)
    } catch (e) { 
      console.error('加载合同失败:', e) 
    }
  }

  const openProjectDrawer = (mode, project = null) => {
      setProjectDrawerMode(mode)
      if (mode === 'create') {
          setNewProj({ 
            name: '', 
            client: '', 
            contractNo: '', 
            totalBudget: '', 
            duration: '', 
            clientFinancialInfo: '',
            projectOverview: '',
            settlementAmount: '',
            paymentMethod: '',
            invoiceInfo: ''
          })
          setEditingId(null)
      } else if (mode === 'edit' || mode === 'view') {
          const p = project || projects.find(x => x.id === currentProjectId)
          if (p) {
            setEditingId(p.id)
            setNewProj({
                name: p.name || '',
                code: p.code || '',
                client: p.client || '',
                contractNo: p.contractNo || '',
                totalBudget: p.totalBudget || '',
                duration: p.duration || '',
                clientFinancialInfo: p.clientFinancialInfo || '',
                projectOverview: p.projectOverview || '',
                settlementAmount: p.settlementAmount || '',
                paymentMethod: p.paymentMethod || '',
                invoiceInfo: p.invoiceInfo || '',
                contractFileUrl: p.contractFileUrl, // For view
                approvalStatus: p.approvalStatus
            })
          }
      }
      setShowProjectDrawer(true)
  }

  const handleDrawerSubmit = async (formData, contractFile, attachments) => {
    const name = String(formData.name || '').trim()
    const totalBudget = String(formData.totalBudget || '').trim()
    
    if (!name || !totalBudget) {
      alert('请填写项目名称和总预算')
      return
    }

    const fd = new FormData()
    fd.append('name', name)
    // 只有在编辑模式下才发送编码，新建时由后端自动生成
    if (editingId) {
      fd.append('code', String(formData.code || '').trim())
    }
    fd.append('client', String(formData.client || '').trim())
    fd.append('contractNo', String(formData.contractNo || '').trim())
    fd.append('totalBudget', totalBudget)
    fd.append('duration', String(formData.duration || '').trim())
    fd.append('clientFinancialInfo', String(formData.clientFinancialInfo || '').trim())
    fd.append('projectOverview', String(formData.projectOverview || '').trim())
    fd.append('settlementAmount', String(formData.settlementAmount || '').trim())
    fd.append('paymentMethod', String(formData.paymentMethod || '').trim())
    fd.append('invoiceInfo', String(formData.invoiceInfo || '').trim())
    if (contractFile) {
      fd.append('contract', contractFile)
    }

    try {
      if (editingId) {
        await updateProject(editingId, fd)
        alert('项目已更新')
      } else {
        const proj = await createProject(fd)
        if (attachments && attachments.length) {
          await uploadProjectAttachments(proj.id, attachments)
        }
        alert(`项目已创建，编号：${proj.code}`)
        // Select the new project
        setCurrentProjectId(proj.id)
      }
      
      const list = await listProjects()
      setProjects(list)
      setShowProjectDrawer(false)
      setNewProj({ name: '', code: '', client: '', contractNo: '', totalBudget: '', duration: '', clientFinancialInfo: '' })
      setEditingId(null)
    } catch (e) {
      alert(e?.message || '操作失败')
    }
  }

  const handleProjectApprove = async (projectId, approved, comments) => {
    try {
      await approveProject(projectId, approved, comments)
      const list = await listProjects()
      setProjects(list)
      setShowProjectDrawer(false)
      alert(approved ? '项目审批通过' : '项目审批拒绝')
    } catch (e) {
      alert(e.message)
    }
  }

  const handleSubmitApproval = async (projectId) => {
    try {
      await submitForApproval(projectId)
      const list = await listProjects()
      setProjects(list)
      setShowProjectDrawer(false)
      alert('项目已提交审批，等待董事长或总经理审批')
    } catch (e) {
      alert(e.message)
    }
  }

  // 合同管理函数
  const handleContractSubmit = async (formData) => {
    try {
      // 创建FormData对象支持文件上传
      const submitData = new FormData()
      
      // 添加基本字段
      submitData.append('projectId', currentProjectId)
      submitData.append('contractNo', formData.contractNo)
      submitData.append('contractName', formData.contractName)
      submitData.append('supplierId', formData.supplierId)
      submitData.append('supplierName', formData.supplierName)
      submitData.append('contractAmount', formData.contractAmount)
      submitData.append('paymentMethod', formData.paymentMethod || '')
      submitData.append('materialList', JSON.stringify(formData.materialList || []))
      
      // 添加文件
      if (formData.contractFile) {
        submitData.append('contractFile', formData.contractFile)
      }
      
      if (editingContract) {
        await updateSupplierContract(editingContract.id, submitData)
        alert('合同已更新')
      } else {
        await createSupplierContract(submitData)
        alert('合同已创建')
      }
      
      await loadProjectContracts(currentProjectId)
      
      // 刷新材料清单（如果当前用户是采购经理）
      if (isProcurement && currentProjectId) {
        await loadProjectMaterials(currentProjectId)
      }
      
      setShowContractForm(false)
      setEditingContract(null)
    } catch (e) {
      alert(e.message)
    }
  }

  const handleContractApprove = async (contractId, approved, comments) => {
    try {
      await approveContract(contractId, approved, comments)
      await loadProjectContracts(currentProjectId)
      
      // 刷新材料清单（如果当前用户是采购经理）
      if (isProcurement && currentProjectId) {
        await loadProjectMaterials(currentProjectId)
      }
      
      alert(approved ? '合同审批通过' : '合同审批拒绝')
    } catch (e) {
      alert(e.message)
    }
  }

  // 删除合同
  const handleDeleteContract = async (contractId) => {
    if (!confirm('确定要删除这个合同吗？此操作不可撤销。')) return
    
    try {
      await deleteSupplierContract(contractId)
      await loadProjectContracts(currentProjectId)
      alert('合同已删除')
    } catch (e) {
      alert(e.message)
    }
  }

  // 归档合同
  const handleArchiveContract = async (contractId) => {
    if (!confirm('确定要归档这个合同吗？归档后合同将不再显示在活动列表中。')) return
    
    try {
      await archiveSupplierContract(contractId)
      await loadProjectContracts(currentProjectId)
      alert('合同已归档')
    } catch (e) {
      alert(e.message)
    }
  }

  const onDeleteProject = async () => {
    if (!editingId) return
    if (!confirm('确定要删除该项目吗？所有相关数据将被永久删除。')) return
    try {
      await deleteProject(editingId)
      const list = await listProjects()
      setProjects(list)
      setShowProjectDrawer(false)
      if (currentProjectId === editingId) {
          setCurrentProjectId(null)
          if (isProcurement) {
              setMaterials([])
          }
      }
    } catch (e) {
      alert(e?.message || '删除失败')
    }
  }

  // 材料清单相关函数（采购经理使用）
  const loadProjectMaterials = async (pid) => {
    try {
      const mats = await listMaterials(pid)
      setMaterials(mats)
    } catch (e) { console.error(e) }
  }

  const handleSelectSuggestion = (type, item) => {
      setNewFormByType(prev => {
          const cur = { ...(prev[type] || {}) }
          cur.name = item.name
          cur.specification = item.specification
          cur.unit = item.unit
          cur.unitPrice = item.unitPrice
          cur.supplier = item.supplier
          const q = Number(cur.quantity) || 0
          cur.totalPrice = (q * Number(item.unitPrice || 0)).toFixed(2)
          return { ...prev, [type]: cur }
      })
      setActiveSuggestionType(null)
  }

  const onImport = async (pid, file) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const allRows = [];
      
      workbook.SheetNames.forEach(sheetName => {
        if (sheetName.includes('汇总')) return;
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
            const row = jsonData[i];
            if (row && row[1] && (String(row[1]).includes('项目名称') || String(row[1]) === '名称')) {
                headerRowIndex = i;
                break;
            }
        }
        
        const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
        const rows = jsonData.slice(startIndex);
        
        rows.forEach(r => {
           const name = String(r[1] || '').trim();
           if (r.length > 0 && name && name !== '项目名称' && name !== '名称' && !name.startsWith('合计') && !name.startsWith('总计')) {
               allRows.push({
                   serialNumber: String(r[0] || ''),
                   name: name,
                   specification: String(r[2] || ''),
                   unit: String(r[3] || ''),
                   quantity: Number(r[4] || 0),
                   unitPrice: Number(r[5] || 0),
                   totalPrice: Number(r[6] || 0),
                   remarks: String(r[7] || ''),
                   type: sheetName,
                   supplier: ''
               });
           }
        });
      });

      if (allRows.length === 0) {
          alert('未找到有效数据，请检查Excel格式');
          return;
      }

      await importMaterialsBatch(pid, allRows);
      await loadProjectMaterials(pid);
      alert(`已成功导入 ${allRows.length} 条数据`);
    } catch (e) { 
        console.error(e);
        alert(e?.message || '导入失败'); 
    }
  }

  const onExport = async (pid) => {
    try {
      const blob = await exportMaterialsXlsx(pid)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const proj = projects.find(p => p.id === pid)
      let name = proj?.name ? String(proj.name).trim() : `项目-${pid}`
      name = name.replace(/[\\/:*?"<>|]/g, '_')
      a.download = `${name}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) { alert(e?.message || '导出失败') }
  }

  const onDeleteMaterial = async (mid) => {
    if (!confirm('确定要删除吗？')) return
    try {
      await deleteMaterial(currentProjectId, mid)
      await loadProjectMaterials(currentProjectId)
    } catch (e) { alert(e?.message || '删除失败') }
  }

  const onBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) return
    try {
      await deleteMaterialsBatch(currentProjectId, Array.from(selectedIds))
      await loadProjectMaterials(currentProjectId)
      setSelectedIds(new Set())
    } catch (e) { alert(e?.message || '批量删除失败') }
  }

  const toggleSelection = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = (ids) => {
    const next = new Set(selectedIds)
    const allSelected = ids.every(id => next.has(id))
    if (allSelected) {
      ids.forEach(id => next.delete(id))
    } else {
      ids.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  const startEdit = (m) => {
    setEditingMaterialId(m.id)
    setEditForm({
      name: m.name || '',
      specification: m.specification || '',
      unit: m.unit || '',
      quantity: m.quantity || 0,
      unitPrice: m.unitPrice || 0,
      totalPrice: m.totalPrice || 0,
      remarks: m.remarks || '',
      supplier: m.supplier || '',
      type: m.type || '材料清单'
    })
  }

  const changeEdit = (e) => {
    const { name, value } = e.target
    setEditForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'quantity' || name === 'unitPrice') {
        const q = Number(next.quantity) || 0
        const p = Number(next.unitPrice) || 0
        next.totalPrice = Number((q * p).toFixed(2))
      }
      return next
    })
  }

  const saveEdit = async (id) => {
    try {
      await updateMaterial(currentProjectId, id, editForm)
      await loadProjectMaterials(currentProjectId)
      setEditingMaterialId(null)
      setEditForm({})
    } catch (e) { alert(e?.message || '保存失败') }
  }

  const cancelEdit = () => {
    setEditingMaterialId(null)
    setEditForm({})
  }

  const changeNew = (type, name, value) => {
    setNewFormByType(prev => {
      const cur = { ...(prev[type] || {}) }
      const next = { ...cur, [name]: value }
      if (name === 'quantity' || name === 'unitPrice') {
        const q = Number(next.quantity) || 0
        const p = Number(next.unitPrice) || 0
        next.totalPrice = Number((q * p).toFixed(2))
      }
      return { ...prev, [type]: next }
    })
  }

  const addNewRow = async (type) => {
    const payload = { ...(newFormByType[type] || {}), type }
    if (!payload.name) {
      alert('请输入名称')
      return
    }
    try {
      await addMaterial(currentProjectId, {
        name: String(payload.name || ''),
        specification: String(payload.specification || ''),
        unit: String(payload.unit || ''),
        quantity: Number(payload.quantity || 0),
        unitPrice: Number(payload.unitPrice || 0),
        totalPrice: Number(payload.totalPrice || 0),
        remarks: String(payload.remarks || ''),
        supplier: String(payload.supplier || ''),
        type
      })
      await loadProjectMaterials(currentProjectId)
      setNewFormByType(prev => ({ ...prev, [type]: {} }))
    } catch (e) { alert(e?.message || '新增失败') }
  }

  // 分组材料
  const groupedMaterials = useMemo(() => {
    const groups = {
        '材料清单': [],
        '施工清单': [],
        '调试清单': []
    } 
    
    materials.forEach(m => {
        let t = m.type || '材料清单'
        if (t !== '施工清单' && t !== '调试清单') {
            t = '材料清单'
        }
        groups[t].push(m)
    })
    
    return {
        '材料清单': groups['材料清单'],
        '施工清单': groups['施工清单'],
        '调试清单': groups['调试清单']
    }
  }, [materials])
  
  // 总经理和董事长看到总览界面
  if (isGM || isChairman) {
    return (
      <div className="space-y-4">
        <ExecutiveOverview 
          projects={projects} 
          selectedProject={selectedProjectForCharts}
          onSelectProject={(project) => {
            setSelectedProjectForCharts(project)
          }}
          onDeselectProject={() => {
            setSelectedProjectForCharts(null)
          }}
        />
        
        {/* Project Drawer */}
        <ProjectDrawer 
          isOpen={showProjectDrawer}
          onClose={() => setShowProjectDrawer(false)}
          mode={projectDrawerMode}
          initialData={newProj}
          onSubmit={handleDrawerSubmit}
          onDelete={onDeleteProject}
          onApprove={handleProjectApprove}
          onSubmitApproval={handleSubmitApproval}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Bar: Dropdown and Project Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
              <span className="font-bold text-gray-700 whitespace-nowrap">当前项目:</span>
              <select 
                className="input max-w-md w-full font-medium" 
                value={currentProjectId || ''} 
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                  <option value="">-- 请选择项目 --</option>
                  {projects.map(p => {
                      const statusText = p.approvalStatus === 'draft' ? '[草稿]' : 
                                        p.approvalStatus === 'pending' ? '[待审批]' : 
                                        p.approvalStatus === 'approved' ? '[已通过]' : 
                                        p.approvalStatus === 'rejected' ? '[已拒绝]' : ''
                      return (
                          <option key={p.id} value={p.id}>
                              {p.name} ({p.code}) {statusText}
                          </option>
                      )
                  })}
              </select>
          </div>
          
          <div className="flex items-center gap-2">
              {currentProjectId && (
                  <button 
                    onClick={() => openProjectDrawer(isPM ? 'edit' : 'view')} 
                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                      {isPM ? '编辑项目信息' : '查看项目详情'}
                  </button>
              )}
              {isPM && (
                  <button 
                    onClick={() => openProjectDrawer('create')} 
                    className="btn bg-blue-600 text-white hover:bg-blue-700"
                  >
                      + 新建项目
                  </button>
              )}
              <button 
                onClick={loadProjectsData} 
                className="btn bg-green-600 text-white hover:bg-green-700"
                title="刷新项目数据"
              >
                  🔄 刷新
              </button>
          </div>
      </div>

      

      {/* Main Content Area */}
      {currentProjectId ? (
          <div className="bg-white rounded-xl shadow-sm min-h-[500px] flex flex-col">
             {/* 标签页导航 */}
             <div className="border-b">
                 <div className="flex">
                     <button 
                         onClick={() => setActiveTab('info')}
                         className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                             activeTab === 'info' 
                                 ? 'border-blue-500 text-blue-600 bg-blue-50' 
                                 : 'border-transparent text-gray-600 hover:text-gray-800'
                         }`}
                     >
                         项目信息
                     </button>
                     {isProcurement && (
                         <button 
                             onClick={() => setActiveTab('materials')}
                             className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                                 activeTab === 'materials' 
                                     ? 'border-blue-500 text-blue-600 bg-blue-50' 
                                     : 'border-transparent text-gray-600 hover:text-gray-800'
                             }`}
                         >
                             材料清单
                         </button>
                     )}
                     {['procurement_manager', 'chairman', 'gm', 'admin'].includes(user?.role) && (
                         <button 
                             onClick={() => setActiveTab('contracts')}
                             className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                                 activeTab === 'contracts' 
                                     ? 'border-blue-500 text-blue-600 bg-blue-50' 
                                     : 'border-transparent text-gray-600 hover:text-gray-800'
                             }`}
                         >
                             采购合同
                         </button>
                     )}
                 </div>
             </div>

             {/* 标签页内容 */}
             {activeTab === 'info' && (
                 <div className="p-4 border-b flex justify-between items-center">
                     <h2 className="font-bold text-lg">项目信息详情</h2>
                     {isPM && (
                         <button 
                           onClick={() => openProjectDrawer('edit')} 
                           className="btn bg-blue-50 text-blue-700 border border-blue-200"
                         >
                            编辑项目
                         </button>
                     )}
                 </div>
             )}

             {activeTab === 'materials' && isProcurement && (
                 <div className="p-4 border-b flex justify-between items-center">
                     <h2 className="font-bold text-lg">项目清单明细</h2>
                     <div className="flex gap-2">
                         <button onClick={() => onExport(currentProjectId)} className="btn bg-green-50 text-green-700 border border-green-200">
                            导出Excel
                         </button>
                         {selectedIds.size > 0 && (
                             <button onClick={onBatchDelete} className="btn bg-red-50 text-red-700 border border-red-200">
                                批量删除 ({selectedIds.size})
                             </button>
                         )}
                         <label className="btn bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer">
                            导入Excel
                            <input type="file" hidden accept=".xlsx, .xls" onChange={(e) => onImport(currentProjectId, e.target.files[0])} />
                         </label>
                     </div>
                 </div>
             )}

             {activeTab === 'contracts' && ['procurement_manager', 'chairman', 'gm', 'admin'].includes(user?.role) && (
                 <div className="p-4 border-b flex justify-between items-center">
                     <div className="flex items-center gap-4">
                         <h2 className="font-bold text-lg">采购合同管理</h2>
                         <label className="flex items-center gap-2 text-sm">
                             <input
                                 type="checkbox"
                                 checked={showArchivedContracts}
                                 onChange={e => setShowArchivedContracts(e.target.checked)}
                                 className="rounded"
                             />
                             <span className="text-gray-600">显示已归档合同</span>
                         </label>
                     </div>
                     {['procurement_manager', 'admin'].includes(user?.role) && (
                         <button 
                             onClick={() => setShowContractForm(true)} 
                             className="btn bg-blue-600 text-white hover:bg-blue-700"
                         >
                             + 新建合同
                         </button>
                     )}
                 </div>
             )}
             
             {/* 标签页内容区域 */}
             <div className="flex-1">
                 {activeTab === 'info' && (
                     // 项目信息内容
                     <div className="p-6">
                         {(() => {
                           const project = projects.find(p => p.id === currentProjectId)
                           if (!project) return <div className="text-gray-500">项目信息加载中...</div>
                           
                           return (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                               {/* 基本信息 */}
                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">基本信息</h3>
                                 
                                 <div className="space-y-3">
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">项目编号:</span>
                                     <span className="flex-1 text-gray-900">{project.code || '-'}</span>
                                   </div>
                                   
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">项目名称:</span>
                                     <span className="flex-1 text-gray-900 font-medium">{project.name || '-'}</span>
                                   </div>
                                   
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">合同编号:</span>
                                     <span className="flex-1 text-gray-900">{project.contractNo || '-'}</span>
                                   </div>
                                   
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">甲方单位:</span>
                                     <span className="flex-1 text-gray-900">{project.client || '-'}</span>
                                   </div>
                                   
                                   <div className="flex items-start">
                                     <span className="w-24 text-gray-600 font-medium">工程概况:</span>
                                     <span className="flex-1 text-gray-900">{project.projectOverview || '-'}</span>
                                   </div>
                                 </div>
                               </div>
                               
                               {/* 财务信息 */}
                               <div className="space-y-4">
                                 <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">财务信息</h3>
                                 
                                 <div className="space-y-3">
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">合同金额:</span>
                                     <span className="flex-1 text-gray-900 font-semibold text-green-600">
                                       ¥{project.totalBudget ? Number(project.totalBudget).toLocaleString() : '-'}
                                     </span>
                                   </div>
                                   
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">结算金额:</span>
                                     <span className="flex-1 text-gray-900">
                                       {project.settlementAmount ? `¥${Number(project.settlementAmount).toLocaleString()}` : '-'}
                                     </span>
                                   </div>
                                   
                                   <div className="flex items-start">
                                     <span className="w-24 text-gray-600 font-medium">付款方式:</span>
                                     <span className="flex-1 text-gray-900 whitespace-pre-line">{project.paymentMethod || '-'}</span>
                                   </div>
                                   
                                   <div className="flex items-start">
                                     <span className="w-24 text-gray-600 font-medium">开票信息:</span>
                                     <span className="flex-1 text-gray-900 whitespace-pre-line">{project.invoiceInfo || '-'}</span>
                                   </div>
                                 </div>
                               </div>
                               
                               {/* 其他信息 */}
                               <div className="space-y-4 lg:col-span-2">
                                 <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">其他信息</h3>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">工期:</span>
                                     <span className="flex-1 text-gray-900">{project.duration || '-'}</span>
                                   </div>
                                   
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">审批状态:</span>
                                     <span className={`flex-1 px-2 py-1 rounded text-xs inline-block w-fit ${
                                       project.approvalStatus === 'draft' ? 'text-gray-600 bg-gray-50' :
                                       project.approvalStatus === 'pending' ? 'text-yellow-600 bg-yellow-50' :
                                       project.approvalStatus === 'approved' ? 'text-green-600 bg-green-50' :
                                       project.approvalStatus === 'rejected' ? 'text-red-600 bg-red-50' :
                                       'text-gray-600 bg-gray-50'
                                     }`}>
                                       {project.approvalStatus === 'draft' ? '草稿' :
                                        project.approvalStatus === 'pending' ? '待审批' :
                                        project.approvalStatus === 'approved' ? '已通过' :
                                        project.approvalStatus === 'rejected' ? '已拒绝' :
                                        project.approvalStatus || '未知'}
                                     </span>
                                   </div>
                                 </div>
                                 
                                 {project.clientFinancialInfo && (
                                   <div className="flex items-start">
                                     <span className="w-24 text-gray-600 font-medium">甲方财务:</span>
                                     <span className="flex-1 text-gray-900 whitespace-pre-line">{project.clientFinancialInfo}</span>
                                   </div>
                                 )}
                                 
                                 {project.contractFileUrl && (
                                   <div className="flex">
                                     <span className="w-24 text-gray-600 font-medium">合同附件:</span>
                                     <a 
                                       href={project.contractFileUrl} 
                                       target="_blank" 
                                       rel="noopener noreferrer" 
                                       className="flex-1 text-blue-600 hover:text-blue-800 underline"
                                     >
                                       查看/下载合同文件
                                     </a>
                                   </div>
                                 )}
                               </div>
                             </div>
                           )
                         })()}
                     </div>
                 )}

                 {activeTab === 'materials' && isProcurement && (
                     // 材料清单内容
                     <div className="p-4 space-y-6">
                         {Object.keys(groupedMaterials).map(type => (
                            <div key={type} className="mb-6">
                                <div className="mb-2 font-bold text-lg px-1">
                                    <span>{type} ({groupedMaterials[type].length})</span>
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                             <thead className="bg-gray-50 text-gray-500 whitespace-nowrap">
                                                 <tr>
                                                    <th className="p-2 w-10 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            onChange={() => toggleSelectAll(groupedMaterials[type].map(m => m.id))}
                                                            checked={groupedMaterials[type].length > 0 && groupedMaterials[type].every(m => selectedIds.has(m.id))}
                                                        />
                                                    </th>
                                                     <th className="p-2 w-16">序号</th>
                                                     <th className="p-2">名称</th>
                                                     <th className="p-2">规格/特征</th>
                                                     <th className="p-2 w-16">单位</th>
                                                     <th className="p-2 w-20 text-right">数量</th>
                                                     <th className="p-2 w-24 text-right">单价</th>
                                                     <th className="p-2 w-24 text-right">合价</th>
                                                     <th className="p-2">供应商</th>
                                                     <th className="p-2">备注</th>
                                                     <th className="p-2 w-20 text-center">操作</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                               <tr className="border-b bg-gray-50">
                                                 <td className="p-2"></td>
                                                 <td className="p-2 text-gray-500 text-xs">—</td>
                                                 <td className="p-2 relative">
                                                    <input 
                                                        className="input w-full" 
                                                        value={(newFormByType[type]?.name) || ''} 
                                                        onChange={e => changeNew(type, 'name', e.target.value)}
                                                        onFocus={() => setActiveSuggestionType(type)}
                                                        onBlur={() => setTimeout(() => setActiveSuggestionType(null), 200)}
                                                        placeholder="输入名称搜索..."
                                                    />
                                                    {activeSuggestionType === type && suggestions.length > 0 && (
                                                        <div className="absolute z-50 w-96 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 left-0 text-left">
                                                            {suggestions.map((item, idx) => (
                                                                <div 
                                                                    key={idx}
                                                                    className="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-0"
                                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(type, item); }}
                                                                >
                                                                    <div className="font-bold text-gray-800">{item.name}</div>
                                                                    <div className="text-gray-500 flex gap-2 flex-wrap">
                                                                        <span>规格: {item.specification || '-'}</span>
                                                                        <span>单位: {item.unit || '-'}</span>
                                                                        <span>单价: {item.unitPrice || '-'}</span>
                                                                        <span>供应商: {item.supplier || '-'}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                 </td>
                                                 <td className="p-2"><input className="input w-full" value={(newFormByType[type]?.specification) || ''} onChange={e => changeNew(type, 'specification', e.target.value)} /></td>
                                                 <td className="p-2"><input className="input w-full" value={(newFormByType[type]?.unit) || ''} onChange={e => changeNew(type, 'unit', e.target.value)} /></td>
                                                 <td className="p-2 text-right"><input className="input w-full text-right" type="number" step="0.01" value={(newFormByType[type]?.quantity) || ''} onChange={e => changeNew(type, 'quantity', e.target.value)} /></td>
                                                 <td className="p-2 text-right"><input className="input w-full text-right" type="number" step="0.01" value={(newFormByType[type]?.unitPrice) || ''} onChange={e => changeNew(type, 'unitPrice', e.target.value)} /></td>
                                                 <td className="p-2 text-right"><input className="input w-full text-right bg-gray-100" type="number" step="0.01" value={(newFormByType[type]?.totalPrice) || 0} readOnly /></td>
                                                 <td className="p-2"><input className="input w-full" value={(newFormByType[type]?.supplier) || ''} onChange={e => changeNew(type, 'supplier', e.target.value)} /></td>
                                                 <td className="p-2"><input className="input w-full" value={(newFormByType[type]?.remarks) || ''} onChange={e => changeNew(type, 'remarks', e.target.value)} /></td>
                                                 <td className="p-2 text-center">
                                                   <button onClick={() => addNewRow(type)} className="text-blue-600 hover:underline">新增</button>
                                                 </td>
                                               </tr>
                                                 {groupedMaterials[type].map((m, idx) => (
                                                     <tr key={m.id} className={`border-b hover:bg-gray-50 ${selectedIds.has(m.id) ? 'bg-blue-50' : ''}`}>
                                                         <td className="p-2 text-center">
                                                             <input 
                                                                type="checkbox" 
                                                                checked={selectedIds.has(m.id)}
                                                                onChange={() => toggleSelection(m.id)}
                                                             />
                                                         </td>
                                                         <td className="p-2 text-gray-500 text-xs">{m.serialNumber || (idx + 1)}</td>
                                                         {editingMaterialId === m.id ? (
                                                           <>
                                                             <td className="p-2"><input className="input w-full" value={editForm.name || ''} onChange={changeEdit} name="name" /></td>
                                                             <td className="p-2"><input className="input w-full" value={editForm.specification || ''} onChange={changeEdit} name="specification" /></td>
                                                             <td className="p-2"><input className="input w-full" value={editForm.unit || ''} onChange={changeEdit} name="unit" /></td>
                                                             <td className="p-2 text-right"><input className="input w-full text-right" type="number" step="0.01" value={editForm.quantity ?? 0} onChange={changeEdit} name="quantity" /></td>
                                                             <td className="p-2 text-right"><input className="input w-full text-right" type="number" step="0.01" value={editForm.unitPrice ?? 0} onChange={changeEdit} name="unitPrice" /></td>
                                                             <td className="p-2 text-right"><input className="input w-full text-right bg-gray-100" type="number" step="0.01" value={editForm.totalPrice ?? 0} readOnly /></td>
                                                             <td className="p-2"><input className="input w-full" value={editForm.supplier || ''} onChange={changeEdit} name="supplier" /></td>
                                                             <td className="p-2"><input className="input w-full" value={editForm.remarks || ''} onChange={changeEdit} name="remarks" /></td>
                                                             <td className="p-2 flex gap-2 justify-center">
                                                               <button onClick={() => saveEdit(m.id)} className="text-blue-600 hover:underline">保存</button>
                                                               <button onClick={cancelEdit} className="text-gray-600 hover:underline">取消</button>
                                                             </td>
                                                           </>
                                                         ) : (
                                                           <>
                                                             <td className="p-2">{m.name}</td>
                                                             <td className="p-2">{m.specification}</td>
                                                             <td className="p-2">{m.unit}</td>
                                                             <td className="p-2 text-right">{m.quantity}</td>
                                                             <td className="p-2 text-right">¥{Number(m.unitPrice || 0).toFixed(2)}</td>
                                                             <td className="p-2 text-right font-medium">¥{Number(m.totalPrice || 0).toFixed(2)}</td>
                                                             <td className="p-2">{m.supplier}</td>
                                                             <td className="p-2">{m.remarks}</td>
                                                             <td className="p-2 flex gap-2 justify-center">
                                                               <button onClick={() => startEdit(m)} className="text-blue-600 hover:underline">编辑</button>
                                                               <button onClick={() => onDeleteMaterial(m.id)} className="text-red-600 hover:underline">删除</button>
                                                             </td>
                                                           </>
                                                         )}
                                                     </tr>
                                                 ))}
                                             </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                         ))}
                     </div>
                 )}

                 {activeTab === 'contracts' && ['procurement_manager', 'chairman', 'gm', 'admin'].includes(user?.role) && (
                     // 采购合同内容
                     <div className="p-4">
                         {contracts.length === 0 ? (
                             <div className="text-center py-12 text-gray-500">
                                 <p className="text-lg mb-2">暂无合同记录</p>
                                 <p className="text-sm">点击上方"新建合同"按钮创建第一个合同</p>
                             </div>
                         ) : (
                             <div className="space-y-4">
                                 {contracts.map(contract => (
                                     <div key={contract.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                         <div className="flex justify-between items-start mb-3">
                                             <div>
                                                 <h3 className="font-semibold text-lg">{contract.contractName}</h3>
                                                 <p className="text-gray-600 text-sm">合同编号: {contract.contractNo}</p>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                 <span className={`px-2 py-1 rounded text-xs ${
                                                     contract.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                                     contract.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                     contract.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                                     'bg-gray-100 text-gray-700'
                                                 }`}>
                                                     {contract.approvalStatus === 'approved' ? '已通过' :
                                                      contract.approvalStatus === 'pending' ? '待审批' :
                                                      contract.approvalStatus === 'rejected' ? '已拒绝' :
                                                      '草稿'}
                                                 </span>
                                                 {contract.isArchived && (
                                                     <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">已归档</span>
                                                 )}
                                             </div>
                                         </div>
                                         
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                             <div>
                                                 <span className="text-gray-600">供应商:</span>
                                                 <p className="font-medium">{contract.supplierName}</p>
                                             </div>
                                             <div>
                                                 <span className="text-gray-600">合同金额:</span>
                                                 <p className="font-medium text-green-600">¥{Number(contract.contractAmount || 0).toLocaleString()}</p>
                                             </div>
                                             <div>
                                                 <span className="text-gray-600">创建时间:</span>
                                                 <p>{new Date(contract.createdAt).toLocaleDateString()}</p>
                                             </div>
                                             <div>
                                                 <span className="text-gray-600">材料数量:</span>
                                                 <p>{contract.materialList ? JSON.parse(contract.materialList).length : 0} 项</p>
                                             </div>
                                         </div>
                                         
                                         <div className="flex justify-end gap-2">
                                             {['procurement_manager', 'admin'].includes(user?.role) && !contract.isArchived && (
                                                 <>
                                                     <button 
                                                         onClick={() => {
                                                             setEditingContract(contract)
                                                             setShowContractForm(true)
                                                         }}
                                                         className="btn bg-blue-50 text-blue-700 border border-blue-200"
                                                     >
                                                         编辑
                                                     </button>
                                                     <button 
                                                         onClick={() => handleArchiveContract(contract.id)}
                                                         className="btn bg-gray-50 text-gray-700 border border-gray-200"
                                                     >
                                                         归档
                                                     </button>
                                                     <button 
                                                         onClick={() => handleDeleteContract(contract.id)}
                                                         className="btn bg-red-50 text-red-700 border border-red-200"
                                                     >
                                                         删除
                                                     </button>
                                                 </>
                                             )}
                                             
                                             {['chairman', 'gm'].includes(user?.role) && contract.approvalStatus === 'pending' && (
                                                 <>
                                                     <button 
                                                         onClick={() => handleContractApprove(contract.id, true)}
                                                         className="btn bg-green-600 text-white"
                                                     >
                                                         审批通过
                                                     </button>
                                                     <button 
                                                         onClick={() => handleContractApprove(contract.id, false)}
                                                         className="btn bg-red-600 text-white"
                                                     >
                                                         审批拒绝
                                                     </button>
                                                 </>
                                             )}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 )}
             </div>
          </div>
      ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <div className="text-gray-400 mb-4">
                  <FolderOpen sx={{ fontSize: 48 }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">请选择项目</h3>
              <p className="text-gray-500 mb-4">从上方下拉菜单中选择一个项目来查看详细信息</p>
              {isPM && (
                  <button 
                    onClick={() => openProjectDrawer('create')} 
                    className="btn bg-blue-600 text-white"
                  >
                      + 创建新项目
                  </button>
              )}
          </div>
      )}

      {/* Project Drawer */}
      <ProjectDrawer 
        isOpen={showProjectDrawer}
        onClose={() => setShowProjectDrawer(false)}
        mode={projectDrawerMode}
        initialData={newProj}
        onSubmit={handleDrawerSubmit}
        onDelete={onDeleteProject}
        onApprove={handleProjectApprove}
        onSubmitApproval={handleSubmitApproval}
      />

      {/* 合同表单 */}
      {showContractForm && (
        <ContractForm
          contract={editingContract}
          projects={projects}
          currentProjectId={currentProjectId}
          onSubmit={handleContractSubmit}
          onCancel={() => {
            setShowContractForm(false)
            setEditingContract(null)
          }}
        />
      )}
    </div>
  )
}
                                                           <>
                                                             <td className="p-2 font-medium">{m.name}</td>
                                                             <td className="p-2 text-gray-600 max-w-xs truncate" title={m.specification}>{m.specification}</td>
                                                             <td className="p-2">{m.unit}</td>
                                                             <td className="p-2 text-right">{m.quantity}</td>
                                                             <td className="p-2 text-right">{m.unitPrice}</td>
                                                             <td className="p-2 text-right font-medium">{m.totalPrice}</td>
                                                             <td className="p-2 text-gray-600">{m.supplier || '-'}</td>
                                                             <td className="p-2 text-gray-500 max-w-xs truncate" title={m.remarks}>{m.remarks}</td>
                                                             <td className="p-2 flex gap-2 justify-center">
                                                                 <button onClick={() => startEdit(m)} className="text-blue-600 hover:underline">编辑</button>
                                                                 <button onClick={() => onDeleteMaterial(m.id)} className="text-red-600 hover:underline">删除</button>
                                                             </td>
                                                           </>
                                                         )}
                                                     </tr>
                                                 ))}
                                                 {groupedMaterials[type].length === 0 && (
                                                     <tr><td colSpan="11" className="p-8 text-center text-gray-400">暂无数据</td></tr>
                                                 )}
                                             </tbody>
                                         </table>
                                     </div>
                             </div>
                           </div>
                        ))}
                     </div>
                 )}

                 {activeTab === 'contracts' && ['procurement_manager', 'chairman', 'gm', 'admin'].includes(user?.role) && (
                     // 采购合同内容
                     <div className="p-6">
                         {contracts.length === 0 ? (
                             <div className="text-center py-12 text-gray-400">
                                 <div className="text-4xl mb-4">📄</div>
                                 <div>暂无采购合同</div>
                                 {['procurement_manager', 'admin'].includes(user?.role) && (
                                     <button 
                                         onClick={() => setShowContractForm(true)}
                                         className="mt-4 btn bg-blue-600 text-white"
                                     >
                                         创建第一个合同
                                     </button>
                                 )}
                             </div>
                         ) : (
                             <div className="space-y-4">
                                 {contracts.map(contract => (
                                     <div key={contract.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                         <div className="flex justify-between items-start">
                                             <div className="flex-1">
                                                 <div className="flex items-center gap-3 mb-2">
                                                     <h3 className="text-lg font-medium">{contract.contractName}</h3>
                                                     <span className="text-sm text-gray-500">({contract.contractNo})</span>
                                                     <span className={`px-2 py-1 rounded text-xs ${
                                                         contract.approvalStatus === 'draft' ? 'text-gray-600 bg-gray-50' :
                                                         contract.approvalStatus === 'pending' ? 'text-yellow-600 bg-yellow-50' :
                                                         contract.approvalStatus === 'approved' ? 'text-green-600 bg-green-50' :
                                                         contract.approvalStatus === 'rejected' ? 'text-red-600 bg-red-50' :
                                                         contract.status === 'archived' ? 'text-purple-600 bg-purple-50' :
                                                         'text-gray-600 bg-gray-50'
                                                     }`}>
                                                         {contract.approvalStatus === 'draft' ? '草稿' :
                                                          contract.approvalStatus === 'pending' ? '待审批' :
                                                          contract.approvalStatus === 'approved' ? '已通过' :
                                                          contract.approvalStatus === 'rejected' ? '已拒绝' :
                                                          contract.status === 'archived' ? '已归档' :
                                                          contract.approvalStatus || '未知'}
                                                     </span>
                                                 </div>
                                                 
                                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                     <div>
                                                         <span className="text-gray-600">供应商:</span>
                                                         <span className="ml-2 text-gray-900">{contract.supplierName}</span>
                                                     </div>
                                                     <div>
                                                         <span className="text-gray-600">合同金额:</span>
                                                         <span className="ml-2 text-gray-900 font-medium">¥{Number(contract.contractAmount || 0).toLocaleString()}</span>
                                                     </div>
                                                     <div>
                                                         <span className="text-gray-600">创建时间:</span>
                                                         <span className="ml-2 text-gray-900">{new Date(contract.createdAt).toLocaleDateString()}</span>
                                                     </div>
                                                 </div>
                                                 
                                                 {contract.paymentMethod && (
                                                     <div className="mt-2 text-sm">
                                                         <span className="text-gray-600">付款方式:</span>
                                                         <span className="ml-2 text-gray-900">{contract.paymentMethod}</span>
                                                     </div>
                                                 )}
                                             </div>
                                             
                                             <div className="flex gap-2 flex-wrap">
                                                 {['procurement_manager', 'admin'].includes(user?.role) && contract.approvalStatus === 'draft' && (
                                                     <button 
                                                         onClick={() => {
                                                             setEditingContract(contract)
                                                             setShowContractForm(true)
                                                         }}
                                                         className="text-blue-600 hover:underline text-sm"
                                                     >
                                                         编辑
                                                     </button>
                                                 )}
                                                 
                                                 {['procurement_manager', 'admin'].includes(user?.role) && contract.approvalStatus === 'draft' && (
                                                     <button 
                                                         onClick={() => handleDeleteContract(contract.id)}
                                                         className="text-red-600 hover:underline text-sm"
                                                     >
                                                         删除
                                                     </button>
                                                 )}
                                                 
                                                 {['procurement_manager', 'admin'].includes(user?.role) && 
                                                  ['approved', 'rejected'].includes(contract.approvalStatus) && (
                                                     <button 
                                                         onClick={() => handleArchiveContract(contract.id)}
                                                         className="text-gray-600 hover:underline text-sm"
                                                     >
                                                         归档
                                                     </button>
                                                 )}
                                                 
                                                 {['chairman', 'gm', 'admin'].includes(user?.role) && 
                                                  (contract.approvalStatus === 'draft' || contract.approvalStatus === 'pending') && (
                                                     <>
                                                         <button 
                                                             onClick={() => {
                                                                 const comments = prompt('请输入审批意见（可选）:')
                                                                 if (comments !== null) {
                                                                     handleContractApprove(contract.id, true, comments)
                                                                 }
                                                             }}
                                                             className="text-green-600 hover:underline text-sm"
                                                         >
                                                             通过
                                                         </button>
                                                         <button 
                                                             onClick={() => {
                                                                 const comments = prompt('请输入拒绝原因:')
                                                                 if (comments !== null) {
                                                                     handleContractApprove(contract.id, false, comments)
                                                                 }
                                                             }}
                                                             className="text-red-600 hover:underline text-sm"
                                                         >
                                                             拒绝
                                                         </button>
                                                     </>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 )}
             </div>
          </div>
      ) : (
          <div className="bg-white rounded-xl shadow-sm p-10 flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
              <div className="flex justify-center mb-4">
                <Description sx={{ fontSize: 64 }} className="text-gray-300" />
              </div>
              <div className="text-xl">请在上方选择一个项目查看详情</div>
              {isPM && <div className="mt-4 text-sm">或点击“新建项目”开始</div>}
          </div>
      )}

      

      {/* Project Drawer */}
      <ProjectDrawer 
        isOpen={showProjectDrawer}
        onClose={() => setShowProjectDrawer(false)}
        mode={projectDrawerMode}
        initialData={newProj}
        onSubmit={handleDrawerSubmit}
        onDelete={onDeleteProject}
        onApprove={handleProjectApprove}
        onSubmitApproval={handleSubmitApproval}
      />

      {/* 合同表单 */}
      {showContractForm && (
        <ContractForm 
          contract={editingContract}
          projects={projects}
          currentProjectId={currentProjectId}
          onSubmit={handleContractSubmit}
          onCancel={() => {
            setShowContractForm(false)
            setEditingContract(null)
          }}
        />
      )}
    </div>
  )
}
