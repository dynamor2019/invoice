import { useEffect, useState } from 'react'
import { getApiBase, getApiHost } from '../store/api'
import { createBill } from '../store/bills'
import { getReasons, findDefaultSelection } from '../store/reasons'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../store/users'
import { 
  Add, 
  Delete, 
  AttachFile, 
  Save, 
  ArrowBack,
  Receipt,
  AttachMoney,
  CalendarToday,
  Note,
  Business,
  Category
} from '@mui/icons-material'

export default function NewBill() {
  const navigate = useNavigate()
  const [reasons, setReasons] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [rows, setRows] = useState([{ 
    amount: '', 
    catId: null, 
    itemId: null, 
    note: '', 
    date: new Date().toISOString().split('T')[0], 
    files: [], 
    previewUrls: [] 
  }])
  const [submitMsg, setSubmitMsg] = useState('')
  const [uploadMsg, setUploadMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const API_BASE = getApiBase()
  const API_HOST = getApiHost()

  // 加载项目列表
  useEffect(() => {
    (async () => {
      try {
        const user = getCurrentUser()
        if (!user?.token) return
        
        const response = await fetch(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        }
      } catch (e) {
        console.warn('load projects failed', e)
      }
    })()
  }, [])

  // 加载事由分级与默认选择
  useEffect(() => {
    (async () => {
      try {
        const list = await getReasons()
        setReasons(list)
        
        // 自动选择默认事由
        const defaultSelection = findDefaultSelection(list)
        if (defaultSelection && rows.length > 0) {
          setRows(prev => prev.map((row, idx) => 
            idx === 0 ? { ...row, catId: defaultSelection.catId, itemId: defaultSelection.itemId } : row
          ))
        }
      } catch (e) {
        console.warn('load reasons failed', e)
      }
    })()
  }, [])

  const addRow = () => {
    setRows(prev => [...prev, { 
      amount: '', 
      catId: null, 
      itemId: null, 
      note: '', 
      date: new Date().toISOString().split('T')[0], 
      files: [], 
      previewUrls: [] 
    }])
  }

  const removeRow = (index) => {
    if (rows.length <= 1) return
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ))
  }

  const handleFileChange = (index, files) => {
    const fileArray = Array.from(files)
    const previewUrls = fileArray.map(file => URL.createObjectURL(file))
    
    updateRow(index, 'files', fileArray)
    updateRow(index, 'previewUrls', previewUrls)
  }

  const removeFile = (rowIndex, fileIndex) => {
    setRows(prev => prev.map((row, i) => {
      if (i === rowIndex) {
        const newFiles = row.files.filter((_, fi) => fi !== fileIndex)
        const newPreviewUrls = row.previewUrls.filter((_, fi) => fi !== fileIndex)
        // 清理URL对象
        if (row.previewUrls[fileIndex]) {
          URL.revokeObjectURL(row.previewUrls[fileIndex])
        }
        return { ...row, files: newFiles, previewUrls: newPreviewUrls }
      }
      return row
    }))
  }

  const getCategoryName = (catId) => {
    const category = reasons.find(r => r.id === catId)
    return category?.name || ''
  }

  const getItemName = (catId, itemId) => {
    const category = reasons.find(r => r.id === catId)
    const item = category?.items?.find(i => i.id === itemId)
    return item?.name || ''
  }

  const getAvailableItems = (catId) => {
    const category = reasons.find(r => r.id === catId)
    return category?.items || []
  }

  const calculateTotal = () => {
    return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 验证
    if (!selectedProject) {
      alert('请选择关联项目')
      return
    }
    
    const validRows = rows.filter(row => 
      row.amount && row.catId && row.itemId && row.date
    )
    
    if (validRows.length === 0) {
      alert('请至少填写一条完整的报销记录')
      return
    }

    setIsSubmitting(true)
    setSubmitMsg('正在提交...')
    
    try {
      // 构建提交数据
      const billData = {
        projectId: selectedProject,
        rows: validRows.map(row => ({
          amount: Number(row.amount),
          categoryId: row.catId,
          itemId: row.itemId,
          note: row.note,
          date: row.date,
          files: row.files
        })),
        totalAmount: calculateTotal()
      }

      await createBill(billData)
      setSubmitMsg('提交成功！')
      
      setTimeout(() => {
        navigate('/home')
      }, 1500)
      
    } catch (e) {
      setSubmitMsg(`提交失败: ${e.message}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-20">
      {/* 现代化头部 */}
      <div className="modern-card p-6 mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Receipt className="text-white" sx={{ fontSize: 24 }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">新建报销单</h1>
              <p className="text-gray-600">填写报销信息并上传相关凭证</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/home')}
            className="modern-btn-secondary flex items-center gap-2"
          >
            <ArrowBack sx={{ fontSize: 16 }} />
            返回
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 项目选择 */}
        <div className="modern-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-4">
            <Business className="text-blue-500" sx={{ fontSize: 24 }} />
            <h2 className="text-xl font-semibold text-gray-800">关联项目</h2>
          </div>
          
          <select
            className="modern-input w-full"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            required
          >
            <option value="">请选择项目</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.code})
              </option>
            ))}
          </select>
        </div>

        {/* 报销明细 */}
        <div className="modern-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AttachMoney className="text-green-500" sx={{ fontSize: 24 }} />
                <h2 className="text-xl font-semibold text-gray-800">报销明细</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">总金额</p>
                <p className="text-2xl font-bold text-green-600">¥{calculateTotal().toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {rows.map((row, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">明细 #{index + 1}</h3>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Delete sx={{ fontSize: 20 }} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 事由分类 */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      <Category sx={{ fontSize: 16 }} className="inline mr-1" />
                      事由分类 *
                    </label>
                    <select
                      className="modern-input w-full"
                      value={row.catId || ''}
                      onChange={(e) => {
                        updateRow(index, 'catId', e.target.value)
                        updateRow(index, 'itemId', null) // 重置子项
                      }}
                      required
                    >
                      <option value="">请选择分类</option>
                      {reasons.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 具体事由 */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">具体事由 *</label>
                    <select
                      className="modern-input w-full"
                      value={row.itemId || ''}
                      onChange={(e) => updateRow(index, 'itemId', e.target.value)}
                      disabled={!row.catId}
                      required
                    >
                      <option value="">请选择具体事由</option>
                      {getAvailableItems(row.catId).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 金额 */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      <AttachMoney sx={{ fontSize: 16 }} className="inline mr-1" />
                      金额 (元) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="modern-input w-full"
                      value={row.amount}
                      onChange={(e) => updateRow(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* 日期 */}
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      <CalendarToday sx={{ fontSize: 16 }} className="inline mr-1" />
                      发生日期 *
                    </label>
                    <input
                      type="date"
                      className="modern-input w-full"
                      value={row.date}
                      onChange={(e) => updateRow(index, 'date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 备注 */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    <Note sx={{ fontSize: 16 }} className="inline mr-1" />
                    备注说明
                  </label>
                  <textarea
                    className="modern-input w-full h-20 resize-none"
                    value={row.note}
                    onChange={(e) => updateRow(index, 'note', e.target.value)}
                    placeholder="请输入备注信息（可选）"
                  />
                </div>

                {/* 文件上传 */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    <AttachFile sx={{ fontSize: 16 }} className="inline mr-1" />
                    上传凭证
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="modern-input w-full"
                    onChange={(e) => handleFileChange(index, e.target.files)}
                  />
                  <p className="text-xs text-gray-500 mt-1">支持图片和PDF文件，可多选</p>
                  
                  {/* 文件预览 */}
                  {row.previewUrls.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {row.previewUrls.map((url, fileIndex) => (
                        <div key={fileIndex} className="relative group">
                          <img
                            src={url}
                            alt={`预览 ${fileIndex + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index, fileIndex)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 添加明细按钮 */}
            <button
              type="button"
              onClick={addRow}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Add sx={{ fontSize: 20 }} />
              添加报销明细
            </button>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="modern-card p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-800">
                总计: ¥{calculateTotal().toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                共 {rows.length} 项明细
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || calculateTotal() === 0}
                className="modern-btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save sx={{ fontSize: 16 }} />
                {isSubmitting ? '提交中...' : '提交报销单'}
              </button>
            </div>
          </div>
          
          {submitMsg && (
            <div className={`mt-4 p-3 rounded-lg text-center ${
              submitMsg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {submitMsg}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}