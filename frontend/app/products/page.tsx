'use client'

import OrderModal from '@/components/OrderModal'
import { productApi, orderApi } from '@/lib/api'

import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import Layout from '@/components/Layout'
import toast from 'react-hot-toast'
import { 
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Package,
  Search,
  Filter
} from 'lucide-react'

interface Product {
  id: number
  sku: string
  name: string
  cost_price: number
  quantity: number
  preset_price?: number
  actual_price?: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)

  // 获取商品列表
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await productApi.getProducts()
      setProducts(response.data)
    } catch (error) {
      console.error('获取商品列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // 创建/更新商品
  const handleSubmit = async (formData: any) => {
    try {
      if (editingProduct) {
        await productApi.updateProduct(editingProduct.sku, formData)
        toast.success('商品更新成功')
      } else {
        await productApi.createProduct(formData)
        toast.success('商品创建成功')
      }
      setShowModal(false)
      setEditingProduct(null)
      fetchProducts()
    } catch (error) {
      console.error('保存商品失败:', error)
    }
  }

  // 删除商品
  const handleDelete = async (sku: string) => {
    if (!confirm('确定要删除这个商品吗？')) return
    
    try {
      await productApi.deleteProduct(sku)
      toast.success('商品删除成功')
      fetchProducts()
    } catch (error) {
      console.error('删除商品失败:', error)
    }
  }

  // CSV导入
  const handleImport = async (file: File) => {
    try {
      const response = await productApi.importProducts(file)
      toast.success(`导入成功！新增 ${response.data.inserted} 个，更新 ${response.data.updated} 个`)
      setShowImportModal(false)
      fetchProducts()
    } catch (error) {
      console.error('导入失败:', error)
    }
  }

  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  const handleCreateOrder = (product: Product) => {
    setSelectedProduct(product)
    setShowOrderModal(true)
  }
  
  // 筛选商品
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="p-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 mr-3 text-primary-600" />
            商品管理
          </h1>
          <p className="mt-2 text-gray-600">管理商品信息、库存和价格</p>
        </div>

        {/* 操作栏 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索商品名称或SKU..."
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
                setEditingProduct(null)
                setShowModal(true)
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增商品
            </button>
          </div>
        </div>

        {/* 商品表格 */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              商品列表 ({filteredProducts.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">SKU</th>
                  <th className="table-header-cell">商品名称</th>
                  <th className="table-header-cell">成本价</th>
                  <th className="table-header-cell">库存数量</th>
                  <th className="table-header-cell">预设售价</th>
                  <th className="table-header-cell">实际售价</th>
                  <th className="table-header-cell">操作</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        <span className="ml-2">加载中...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-8 text-gray-500">
                      暂无商品数据
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="table-cell font-mono text-sm">{product.sku}</td>
                      <td className="table-cell font-medium">{product.name}</td>
                      <td className="table-cell">¥{product.cost_price.toFixed(2)}</td>
                      <td className="table-cell">
                        <span className={`badge ${product.quantity > 10 ? 'badge-success' : product.quantity > 0 ? 'badge-warning' : 'badge-danger'}`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="table-cell">
                        {product.preset_price ? `¥${product.preset_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="table-cell">
                        {product.actual_price ? `¥${product.actual_price.toFixed(2)}` : '-'}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product)
                              setShowModal(true)
                            }}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <b></b>
                          <button
                            onClick={() => handleDelete(product.sku)}
                            className="text-danger-600 hover:text-danger-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                            <b></b>
                          
                          <button 
                            onClick={() => handleCreateOrder(product)}
                            className="text-success-600 hover:text-success-800"
                            title="为该商品创建订单"
                          >
                            <ShoppingCart className="h-4 w-4" />
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

        {/* 新增/编辑商品模态框 */}
        {showModal && (
          <ProductModal
            product={editingProduct}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowModal(false)
              setEditingProduct(null)
            }}
          />
        )}

        {/* CSV导入模态框 */}
        {showImportModal && (
          <ImportModal
            onImport={handleImport}
            onClose={() => setShowImportModal(false)}
            title="导入商品CSV"
            description="请选择包含商品信息的CSV文件"
            requiredFields={['sku', 'name', 'cost_price', 'quantity']}
            optionalFields={['preset_price', 'actual_price']}
          />
        )}

        {/* 商品表格后面，加上创建订单的模态框 */}
        {showOrderModal && selectedProduct && (
          <OrderModal
            order={null}
            products={[selectedProduct]}  // 锁定当前商品
            onSubmit={async (formData: any) => {
              await orderApi.createOrder({
                ...formData,
                product_sku: selectedProduct.sku,
              })
              toast.success('订单创建成功')
              setShowOrderModal(false)
            }}
            onClose={() => setShowOrderModal(false)}
          />
        )}

      </div>
    </Layout>
  )
}

// 商品表单组件
function ProductModal({ product, onSubmit, onClose }: {
  product: Product | null
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    cost_price: product?.cost_price?.toString() || '',
    quantity: product?.quantity?.toString() || '',
    preset_price: product?.preset_price?.toString() || '',
    actual_price: product?.actual_price?.toString() || '',
  })
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
      quantity: formData.quantity ? parseInt(formData.quantity) : 0,
      preset_price: formData.preset_price ? parseFloat(formData.preset_price) : 0,
      actual_price: formData.actual_price ? parseFloat(formData.actual_price) : 0,
    }
    onSubmit(submitData)
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          {product ? '编辑商品' : '新增商品'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">SKU *</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="form-input"
              required
              disabled={!!product}
            />
          </div>
          <div>
            <label className="form-label">商品名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">成本价 *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">库存数量 *</label>
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">预设售价</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.preset_price}
              onChange={(e) => setFormData({ ...formData, preset_price: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">最新售价</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.actual_price}
              onChange={(e) => setFormData({ ...formData, actual_price: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary flex-1">
              {product ? '更新' : '创建'}
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

// CSV导入组件
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
