'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { orderApi, productApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  ShoppingCart,
  Search,
  Eye
} from 'lucide-react'

interface Order {
  id: number
  order_number: string
  created_at: string
  transaction_date?: string
  buyer_name?: string
  actual_price: number
  quantity: number
  profit: number
  payment_method: 'cash' | 'payid'
  channel: 'eBay' | 'Facebook' | 'saltFish' | 'other'
  status: 'pending' | 'done'
  product_id: number
  remark?: string | null
}

interface Product {
  id: number
  sku: string
  name: string
  cost_price: number
  quantity: number
  preset_price?: number
  actual_price?: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<Order | null>(null)
//加排序状态
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  })
  // 获取订单和商品列表
  const fetchData = async () => {
    try {
      setLoading(true)
      const [ordersResponse, productsResponse] = await Promise.all([
        orderApi.getOrders(),
        productApi.getProducts()
      ])
      
      // 按交易日期倒序
      const sortedOrders = [...ordersResponse.data].sort((a, b) => {
        if (!a.transaction_date) return 1
        if (!b.transaction_date) return -1
        return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      })
      
      setOrders(sortedOrders)
      setProducts(productsResponse.data)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 点击排序按钮时切换排序字段
  const handleSort = (key: keyof Order) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 创建/更新订单
  const handleSubmit = async (formData: any) => {
    try {
      if (editingOrder) {
        await orderApi.updateOrder(editingOrder.id, formData)
        toast.success('订单更新成功')
      } else {
        await orderApi.createOrder(formData)
        toast.success('订单创建成功')
      }
      setShowModal(false)
      setEditingOrder(null)
      fetchData()
    } catch (error) {
      console.error('保存订单失败:', error)
    }
  }

  // 删除单个订单
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个订单吗？删除后会自动恢复库存。')) return
    
    try {
      await orderApi.deleteOrder(id)
      toast.success('订单删除成功')
      fetchData()
    } catch (error) {
      console.error('删除订单失败:', error)
    }
  }

  // 🚀 批量删除状态
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState(0)

  // 🚀 批量删除订单（带进度条）
  const handleBulkDeleteOrders = async () => {
    if (!confirm(`确定要删除当前显示的 ${filteredOrders.length} 个订单吗？`)) return

    setDeleting(true)
    setDeleteProgress(0)

    try {
      const total = filteredOrders.length

      for (let i = 0; i < total; i++) {
        await orderApi.deleteOrder(filteredOrders[i].id)
        setDeleteProgress(Math.round(((i + 1) / total) * 100))
        await new Promise(resolve => setTimeout(resolve, 100)) // 给 UI 时间刷新
      }

      toast.success(`成功删除 ${total} 个订单`)
      fetchData()
    } catch (error) {
      console.error('批量删除订单失败:', error)
      toast.error('批量删除订单失败')
    } finally {
      setTimeout(() => setDeleting(false), 800)
    }
  }

  // CSV导入
  const handleImport = async (file: File) => {
    try {
      const response = await orderApi.importOrders(file)
      toast.success(`导入完成！新增 ${response.data.inserted} 个，跳过 ${response.data.skipped} 个`)
      if (response.data.errors.length > 0) {
        toast.error(`有 ${response.data.errors.length} 个错误`)
      }
      setShowImportModal(false)
      fetchData()
    } catch (error) {
      console.error('导入失败:', error)
    }
  }

  // 筛选订单
  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (products.find(p => p.id === order.product_id)?.name && products.find(p => p.id === order.product_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )
// 排序逻辑
if (sortConfig.key) {
  const key = sortConfig.key as keyof Order
  filteredOrders.sort((a, b) => {
    const aValue = a[key] ?? 0
    const bValue = b[key] ?? 0
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    return 0
  })
}

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'Facebook': return 'badge-primary'
      case "saltFish": return 'badge-warning'
      case 'eBay': return 'badge-success'
      default: return 'badge-secondary'
    }
  }

  const getStatusBadge = (status: string) => {
    return status === 'done' ? 'badge-success' : 'badge-warning'
  }

  return (
    <Layout>
      <div className="p-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-8 w-8 mr-3 text-success-600" />
            订单管理
          </h1>
          <p className="mt-2 text-gray-600">管理订单信息，自动扣减库存</p>
        </div>

        {/* 操作栏 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索订单号或商品名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowImportModal(true)} className="btn-secondary">
              <Upload className="h-4 w-4 mr-2" />
              导入CSV
            </button>
            <button
              onClick={() => {
                setEditingOrder(null)
                setShowModal(true)
              }}
              className="btn-success"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增订单
            </button>
            <button onClick={handleBulkDeleteOrders} className="btn-danger">
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除
            </button>
          </div>
        </div>

        {/* 🚀 批量删除进度条 */}
        {deleting && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded h-3">
              <div
                className="bg-red-500 h-3 rounded transition-all duration-300"
                style={{ width: `${deleteProgress}%` }}
              ></div>
            </div>
            <p className="text-sm mt-2 text-gray-600">
              正在删除订单... {deleteProgress}%
            </p>
          </div>
        )}

        {/* 订单表格 */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              订单列表 ({filteredOrders.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">订单号</th>
                  <th className="table-header-cell">
                    交易日期
                    <button onClick={() => handleSort('quantity')} className="ml-1 text-xs text-gray-500">
                      ⇅
                    </button>
                  </th>
                  <th className="table-header-cell">买家</th>
                  <th className="table-header-cell">商品名称</th>
                  <th className="table-header-cell">
                    数量
                    <button onClick={() => handleSort('quantity')} className="ml-1 text-xs text-gray-500">
                      ⇅
                    </button>
                  </th>
                  <th className="table-header-cell">
                    售价
                    <button onClick={() => handleSort('actual_price')} className="ml-1 text-xs text-gray-500">
                      ⇅
                    </button>
                  </th>
                  <th className="table-header-cell">
                    利润
                    <button onClick={() => handleSort('profit')} className="ml-1 text-xs text-gray-500">
                      ⇅
                    </button>
                  </th>
                  <th className="table-header-cell">渠道</th>
                  <th className="table-header-cell">状态</th>
                  <th className="table-header-cell">备注</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="table-cell text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-success-600"></div>
                        <span className="ml-2">加载中...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-cell text-center py-8 text-gray-500">
                      暂无订单数据
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="table-cell font-mono text-sm">{order.order_number}</td>
                      <td className="table-cell">
                        {order.transaction_date 
                          ? new Date(order.transaction_date).toLocaleDateString('zh-CN')
                          : new Date(order.created_at).toLocaleDateString('zh-CN')
                        }
                      </td>
                      <td className="table-cell">{order.buyer_name || '-'}</td>
                      <td className="table-cell font-mono text-sm">
                        {products.find(p => p.id === order.product_id)?.name || 'N/A'}
                      </td>
                      <td className="table-cell">{order.quantity}</td>
                      <td className="table-cell font-medium">¥{order.actual_price.toFixed(2)}</td>
                      <td className="table-cell font-medium text-success-600">
                        {(() => {
                          const product = products.find(p => p.id === order.product_id)
                          if (!product) return 'N/A'
                          const profit = (order.actual_price - product.cost_price) * order.quantity
                          return `¥${profit.toFixed(2)}`
                        })()}
                      </td>

                      <td className="table-cell">
                        <span className={`badge ${getChannelBadge(order.channel)}`}>
                          {order.channel}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusBadge(order.status)}`}>
                          {order.status === 'done' ? '已完成' : 'pending'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-700">{order.remark || "-"}</td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDetailModal(order)}
                            className="text-primary-600 hover:text-primary-800"
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingOrder(order)
                              setShowModal(true)
                            }}
                            className="text-warning-600 hover:text-warning-800"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-danger-600 hover:text-danger-800"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 新增/编辑订单模态框 */}
        {showModal && (
          <OrderModal
            order={editingOrder}
            products={products}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowModal(false)
              setEditingOrder(null)
            }}
          />
        )}

        {/* 订单详情模态框 */}
        {showDetailModal && (
          <OrderDetailModal
            order={showDetailModal}
            products={products}
            onClose={() => setShowDetailModal(null)}
          />
        )}

        {/* CSV导入模态框 */}
        {showImportModal && (
          <ImportModal
            onImport={handleImport}
            onClose={() => setShowImportModal(false)}
            title="导入订单CSV"
            description="请选择包含订单信息的CSV文件"
            requiredFields={['product_sku', 'actual_price', 'quantity', 'payment_method', 'channel', 'status']}
            optionalFields={['transaction_date', 'buyer_name']}
          />
        )}
      </div>
    </Layout>
  )
}

// ✅ 正确的 OrderModal（订单号自动生成）
function OrderModal({ order, products, onSubmit, onClose }: {
  order: Order | null
  products: Product[]
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    product_sku: order ? products.find(p => p.id === order.product_id)?.sku || '' : '',
    actual_price: order?.actual_price?.toString() || '',
    quantity: order?.quantity?.toString() || '',
    payment_method: order?.payment_method || 'cash',
    channel: order?.channel || 'eBay',
    status: order?.status || 'pending',
    buyer_name: order?.buyer_name || '',
    transaction_date: order?.transaction_date? new Date(order.transaction_date).toISOString().split('T')[0] : '',
    remark: order?.remark || '',
  })


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData = {
      ...formData,
      actual_price: formData.actual_price ? parseFloat(formData.actual_price) : 0,
      quantity: formData.quantity ? parseInt(formData.quantity) : 0,
      transaction_date: new Date(formData.transaction_date).toISOString(),
    }
    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {order ? '编辑订单' : '新增订单'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 商品选择 */}
          <div>
            <label className="form-label">商品 *</label>
            {order ? (
              <input
                type="text"
                value={`${products.find(p => p.id)?.name || ''} - ${products.find(p => p.id)?.sku || ''} (库存: ${products.find(p => p.id)?.quantity})`}
                className="form-input"
                disabled
              />
            ) : (
              <select
                value={formData.product_sku}
                onChange={(e) => {
                  const selectedSku = e.target.value
                  const selectedProduct = products.find(p => p.sku === selectedSku)

                  setFormData({
                    ...formData,
                    product_sku: selectedSku,
                    actual_price: !order && selectedProduct?.preset_price
                      ? selectedProduct?.preset_price.toString()
                      : formData.actual_price,
                  })
                }}
                className="form-input"
                required
              >
                <option value="">选择商品</option>
                {products.map(p => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.name} (库存: {p.quantity})
                  </option>
                ))}
              </select>


            )}
          </div>

          {/* 实际售价 */}
          <div>
            <label className="form-label">实际售价 *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.actual_price}
              onChange={(e) => setFormData({ ...formData, actual_price: e.target.value })}
              className="form-input"
              required
            />
          </div>

          {/* 数量 */}
          <div>
            <label className="form-label">数量 *</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="form-input"
              required
            />
          </div>

          {/* 支付方式 */}
          <div>
            <label className="form-label">支付方式 *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as 'cash' | 'payid' })}
              className="form-input"
              required
            >
              <option value="cash">现金</option>
              <option value="payid">PayID</option>
            </select>
          </div>

          {/* 渠道 */}
          <div>
            <label className="form-label">销售渠道 *</label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value as 'eBay' | 'Facebook' | 'saltFish' | 'other' })}
              className="form-input"
              required
            >
              <option value="eBay">eBay</option>
              <option value="Facebook">Facebook</option>
              <option value="saltFish">咸鱼</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* 状态 */}
          <div>
            <label className="form-label">订单状态 *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'done' })}
              className="form-input"
              required
            >
              <option value="pending">待处理</option>
              <option value="done">已完成</option>
            </select>
          </div>

          {/* 买家 */}
          <div>
            <label className="form-label">买家姓名</label>
            <input
              type="text"
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              className="form-input"
            />
          </div>

          {/* 日期 */}
          <div>
            <label className="form-label">交易日期 *</label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="form-input"
              required
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="form-label">备注</label>
            <input
              type="text"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-success flex-1">
              {order ? '更新' : '创建'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ✅ 订单详情
function OrderDetailModal({ order, products, onClose }: {
  order: Order
  products: Product[]
  onClose: () => void
}) {
  const product = products.find(p => p.id === order.product_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">订单详情</h3>
        <div className="space-y-2 text-sm">
          <p><strong>订单号：</strong>{order.order_number}</p>
          <p><strong>商品：</strong>{product ? product.name : '未知商品'} ({product?.sku})</p>
          <p><strong>数量：</strong>{order.quantity}</p>
          <p><strong>售价：</strong>¥{order.actual_price.toFixed(2)}</p>
          <p><strong>利润：</strong>¥{order.profit.toFixed(2)}</p>
          <p><strong>支付方式：</strong>{order.payment_method === 'cash' ? '现金' : 'PayID'}</p>
          <p><strong>渠道：</strong>{order.channel}</p>
          <p><strong>状态：</strong>{order.status === 'done' ? '已完成' : '待处理'}</p>
          <p><strong>买家：</strong>{order.buyer_name || '-'}</p>
          <p><strong>备注：</strong>{order.remark || '-'}</p>
          <p><strong>创建时间：</strong>{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-secondary">关闭</button>
        </div>
      </div>
    </div>
  )
}

// ✅ CSV 导入
function ImportModal({ onImport, onClose, title, description, requiredFields, optionalFields }: {
  onImport: (file: File) => void
  onClose: () => void
  title: string
  description: string
  requiredFields: string[]
  optionalFields: string[]
}) {
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (file) onImport(file)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">必填字段：</h4>
          <div className="flex flex-wrap gap-1">
            {requiredFields.map(field => <span key={field} className="badge badge-primary">{field}</span>)}
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">可选字段：</h4>
          <div className="flex flex-wrap gap-1">
            {optionalFields.map(field => <span key={field} className="badge badge-secondary">{field}</span>)}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label">选择CSV文件</label>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="form-input" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={!file}>导入</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button>
          </div>
        </form>
      </div>
    </div>
  )
}
