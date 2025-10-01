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
  channel: 'eBay' | 'Facebook' | 'saltFish' |'other'
  status: 'pending' | 'done'
  product_id: number
  remark?:string | null
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

        // 让进度条可见，避免 UI 太快
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      toast.success(`成功删除 ${total} 个订单`)
      fetchData()
    } catch (error) {
      console.error('批量删除订单失败:', error)
      toast.error('批量删除订单失败')
    } finally {
      setTimeout(() => setDeleting(false), 800) // 显示 100% 后再关闭
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
        {/* ⚠️ 下面保持你的原始代码，不再贴全，以节省篇幅 */}
      </div>
    </Layout>
  )
}
