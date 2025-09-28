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
  payment_method: 'cash' | 'payid'
  channel: 'eBay' | 'Facebook' | 'other'
  status: 'pending' | 'done'
  product_id: number
}

interface Product {
  id: number
  sku: string
  name: string
  cost_price: number
  quantity: number
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

  // 获取订单和商品列表
  const fetchData = async () => {
    try {
      setLoading(true)
      const [ordersResponse, productsResponse] = await Promise.all([
        orderApi.getOrders(),
        productApi.getProducts()
      ])
      setOrders(ordersResponse.data)
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

  // 删除订单
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个订单吗？删除后不会恢复库存！')) return
    
    try {
      await orderApi.deleteOrder(id)
      toast.success('订单删除成功')
      fetchData()
    } catch (error) {
      console.error('删除订单失败:', error)
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
    (order.buyer_name && order.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 获取渠道徽章样式
  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'eBay': return 'badge-primary'
      case 'Facebook': return 'badge-success'
      default: return 'badge-secondary'
    }
  }

  // 获取状态徽章样式
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
                placeholder="搜索订单号或买家姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary"
            >
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
          </div>
        </div>

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
                  <th className="table-header-cell">交易日期</th>
                  <th className="table-header-cell">买家</th>
                  <th className="table-header-cell">商品SKU</th>
                  <th className="table-header-cell">数量</th>
                  <th className="table-header-cell">售价</th>
                  <th className="table-header-cell">渠道</th>
                  <th className="table-header-cell">状态</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="table-cell text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-success-600"></div>
                        <span className="ml-2">加载中...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-cell text-center py-8 text-gray-500">
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
                        {products.find(p => p.id === order.product_id)?.sku || 'N/A'}
                      </td>
                      <td className="table-cell">{order.quantity}</td>
                      <td className="table-cell font-medium">¥{order.actual_price.toFixed(2)}</td>
                      <td className="table-cell">
                        <span className={`badge ${getChannelBadge(order.channel)}`}>
                          {order.channel}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getStatusBadge(order.status)}`}>
                          {order.status === 'done' ? '已完成' : '待处理'}
                        </span>
                      </td>
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
            requiredFields={['order_number', 'product_sku', 'actual_price', 'quantity', 'payment_method', 'channel', 'status']}
            optionalFields={['transaction_date', 'buyer_name']}
          />
        )}
      </div>
    </Layout>
  )
}

// 订单表单组件
function OrderModal({ order, products, onSubmit, onClose }: {
  order: Order | null
  products: Product[]
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    order_number: order?.order_number || '',
    product_sku: '',
    actual_price: order?.actual_price || 0,
    quantity: order?.quantity || 1,
    payment_method: order?.payment_method || 'cash',
    channel: order?.channel || 'eBay',
    status: order?.status || 'pending',
    buyer_name: order?.buyer_name || '',
    transaction_date: order?.transaction_date ? order.transaction_date.split('T')[0] : '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      actual_price: parseFloat(formData.actual_price.toString()),
      quantity: parseInt(formData.quantity.toString()),
      transaction_date: formData.transaction_date ? new Date(formData.transaction_date).toISOString() : null,
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
          <div>
            <label className="form-label">订单号 *</label>
            <input
              type="text"
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              className="form-input"
              required
              disabled={!!order}
            />
          </div>
          <div>
            <label className="form-label">商品SKU *</label>
            <select
              value={formData.product_sku}
              onChange={(e) => setFormData({ ...formData, product_sku: e.target.value })}
              className="form-input"
              required
            >
              <option value="">选择商品</option>
              {products.map(product => (
                <option key={product.sku} value={product.sku}>
                  {product.sku} - {product.name} (库存: {product.quantity})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">实际售价 *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.actual_price}
              onChange={(e) => setFormData({ ...formData, actual_price: parseFloat(e.target.value) || 0 })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">数量 *</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="form-input"
              required
            />
          </div>
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
          <div>
            <label className="form-label">销售渠道 *</label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value as 'eBay' | 'Facebook' | 'other' })}
              className="form-input"
              required
            >
              <option value="eBay">eBay</option>
              <option value="Facebook">Facebook</option>
              <option value="other">其他</option>
            </select>
          </div>
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
          <div>
            <label className="form-label">买家姓名</label>
            <input
              type="text"
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">交易日期</label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
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

// 订单详情组件
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
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">订单号</label>
            <p className="font-mono">{order.order_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">商品信息</label>
            <p>{product?.name} ({product?.sku})</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">数量</label>
            <p>{order.quantity}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">售价</label>
            <p className="font-medium">¥{order.actual_price.toFixed(2)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">成本</label>
            <p>¥{product ? (product.cost_price * order.quantity).toFixed(2) : 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">利润</label>
            <p className="font-medium text-success-600">
              ¥{product ? (order.actual_price * order.quantity - product.cost_price * order.quantity).toFixed(2) : 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">渠道</label>
            <p>{order.channel}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">支付方式</label>
            <p>{order.payment_method === 'cash' ? '现金' : 'PayID'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">状态</label>
            <p>{order.status === 'done' ? '已完成' : '待处理'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">买家</label>
            <p>{order.buyer_name || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">交易日期</label>
            <p>{order.transaction_date ? new Date(order.transaction_date).toLocaleString('zh-CN') : '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">创建时间</label>
            <p>{new Date(order.created_at).toLocaleString('zh-CN')}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

// CSV导入组件（复用）
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
    if (file) {
      onImport(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">必填字段：</h4>
          <div className="flex flex-wrap gap-1">
            {requiredFields.map(field => (
              <span key={field} className="badge badge-primary">{field}</span>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">可选字段：</h4>
          <div className="flex flex-wrap gap-1">
            {optionalFields.map(field => (
              <span key={field} className="badge badge-secondary">{field}</span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label">选择CSV文件</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="form-input"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={!file}>
              导入
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
