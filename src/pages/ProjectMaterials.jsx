import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../store/users'

export default function ProjectMaterials() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [materials, setMaterials] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({})

  // 权限检查
  const canManage = user?.role === 'procurement_manager' || 
                   user?.role === 'project_manager' || 
                   user?.role === 'admin'

  // 材料分类选项
  const categories = ['材料清单', '施工清单', '调试清单']

  useEffect(() => {
    loadMaterials()
  }, [projectId])

  const loadMaterials = async () => {
    try {
      setMaterials([
        {
          id: '1',
          name: '钢筋',
          specification: 'HRB400 φ12',
          unit: '吨',
          quantity: 10,
          unitPrice: 4500,
          totalPrice: 45000,
          supplier: '钢材供应商A',
          type: '材料清单',
          remarks: '主体结构用'
        },
        {
          id: '2', 
          name: '混凝土',
          specification: 'C30',
          unit: '立方米',
          quantity: 50,
          unitPrice: 350,
          totalPrice: 17500,
          supplier: '混凝土供应商B',
          type: '材料清单',
          remarks: '基础浇筑用'
        },
        {
          id: '3',
          name: '电缆',
          specification: 'YJV 3×120+1×70',
          unit: '米',
          quantity: 200,
          unitPrice: 45,
          totalPrice: 9000,
          supplier: '电缆供应商C',
          type: '施工清单',
          remarks: '主线路敷设'
        }
      ])
    } catch (e) {
      console.error('加载材料失败:', e)
    }
  }

  const handleEdit = (material) => {
    setEditingId(material.id)
    setEditingData({...material})
  }

  const handleSave = () => {
    if (!editingData.name?.trim()) {
      alert('请填写材料名称')
      return
    }

    const updatedMaterial = {
      ...editingData,
      quantity: Number(editingData.quantity) || 0,
      unitPrice: Number(editingData.unitPrice) || 0,
      totalPrice: Number(editingData.totalPrice) || 0
    }

    setMaterials(materials.map(m => m.id === editingId ? updatedMaterial : m))
    alert('材料更新成功')
    setEditingId(null)
    setEditingData({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleDelete = (material) => {
    if (!confirm(`确定要删除材料"${material.name}"吗？`)) return
    setMaterials(materials.filter(m => m.id !== material.id))
    alert('材料删除成功')
  }

  const handleAddNew = () => {
    const newId = Date.now().toString()
    const newMaterial = {
      id: newId,
      name: '',
      specification: '',
      unit: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      supplier: '',
      type: '材料清单',
      remarks: ''
    }
    setMaterials([...materials, newMaterial])
    setEditingId(newId)
    setEditingData(newMaterial)
  }

  // 按分类分组材料
  const getMaterialsByCategory = (category) => {
    return materials.filter(m => m.type === category)
  }

  return (
    <div className="min-h-screen p-2 pb-16">
      {/* 页面头部 */}
      <div className="modern-card p-3 mb-3 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/projects')}
              className="p-2 hover:bg-gray-100 rounded-lg text-sm"
            >
              ← 返回
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-800">材料清单管理</h1>
              <p className="text-xs text-gray-600">项目ID: {projectId}</p>
            </div>
          </div>
          {canManage && (
            <button 
              onClick={handleAddNew}
              className="modern-btn flex items-center gap-1 text-xs px-2 py-1"
            >
              + 添加材料
            </button>
          )}
        </div>
      </div>

      {/* 按分类显示材料 */}
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryMaterials = getMaterialsByCategory(category)
          return (
            <div key={category} className="modern-card p-3 animate-fade-in-up">
              <h2 className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500">
                {category} ({categoryMaterials.length})
              </h2>
              
              {categoryMaterials.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  暂无{category}数据
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="modern-table w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-xs px-2 py-2">材料名称</th>
                        <th className="text-xs px-2 py-2">规格型号</th>
                        <th className="text-xs px-2 py-2">单位</th>
                        <th className="text-xs px-2 py-2">数量</th>
                        <th className="text-xs px-2 py-2">单价</th>
                        <th className="text-xs px-2 py-2">总价</th>
                        <th className="text-xs px-2 py-2">供应商</th>
                        {canManage && <th className="text-xs px-2 py-2">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryMaterials.map((material) => (
                        <tr key={material.id} className={`border-t ${editingId === material.id ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                          {editingId === material.id ? (
                            <>
                              <td className="px-2 py-2"><input type="text" className="modern-input w-full text-xs" value={editingData.name} onChange={e => setEditingData({...editingData, name: e.target.value})} /></td>
                              <td className="px-2 py-2"><input type="text" className="modern-input w-full text-xs" value={editingData.specification} onChange={e => setEditingData({...editingData, specification: e.target.value})} /></td>
                              <td className="px-2 py-2"><input type="text" className="modern-input w-full text-xs" value={editingData.unit} onChange={e => setEditingData({...editingData, unit: e.target.value})} /></td>
                              <td className="px-2 py-2"><input type="number" step="0.01" className="modern-input w-full text-xs" value={editingData.quantity} onChange={e => {const q = e.target.value; const tp = q && editingData.unitPrice ? (Number(q) * Number(editingData.unitPrice)).toFixed(2) : ''; setEditingData({...editingData, quantity: q, totalPrice: tp})}} /></td>
                              <td className="px-2 py-2"><input type="number" step="0.01" className="modern-input w-full text-xs" value={editingData.unitPrice} onChange={e => {const p = e.target.value; const tp = editingData.quantity && p ? (Number(editingData.quantity) * Number(p)).toFixed(2) : ''; setEditingData({...editingData, unitPrice: p, totalPrice: tp})}} /></td>
                              <td className="px-2 py-2"><input type="number" step="0.01" className="modern-input w-full text-xs" value={editingData.totalPrice} onChange={e => setEditingData({...editingData, totalPrice: e.target.value})} /></td>
                              <td className="px-2 py-2"><input type="text" className="modern-input w-full text-xs" value={editingData.supplier} onChange={e => setEditingData({...editingData, supplier: e.target.value})} /></td>
                              {canManage && (
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <button onClick={handleSave} className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 whitespace-nowrap">保存</button>
                                    <button onClick={handleCancel} className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 whitespace-nowrap">取消</button>
                                  </div>
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              <td className="font-medium text-xs px-2 py-2">{material.name}</td>
                              <td className="text-xs px-2 py-2">{material.specification}</td>
                              <td className="text-xs px-2 py-2">{material.unit}</td>
                              <td className="text-xs px-2 py-2">{material.quantity}</td>
                              <td className="text-xs px-2 py-2">¥{Number(material.unitPrice || 0).toLocaleString()}</td>
                              <td className="text-xs px-2 py-2">¥{Number(material.totalPrice || 0).toLocaleString()}</td>
                              <td className="text-xs px-2 py-2">{material.supplier}</td>
                              {canManage && (
                                <td className="text-xs px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => handleEdit(material)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(material)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
