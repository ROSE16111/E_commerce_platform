'use client'
import { useState } from 'react'

// 定义接口
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
  channel: 'eBay' | 'Facebook' | 'other'
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
}

// 组件
export default function OrderModal({ order, products, onSubmit, onClose }: {
  order: Order | null
  products: Product[]
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    order_number: order?.order_number || '',
    product_sku: '',
    actual_price: order ? order.actual_price.toString() : '',
    quantity: order ? order.quantity.toString() : '',
    payment_method: order?.payment_method || 'cash',
    channel: order?.channel || 'eBay',
    status: order?.status || 'pending',
    buyer_name: order?.buyer_name || '',
    transaction_date: order?.transaction_date ? order.transaction_date.split('T')[0] : '',
    remark: order?.remark || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      actual_price: formData.actual_price ? parseFloat(formData.actual_price) : 0,
      quantity: formData.quantity ? parseInt(formData.quantity) : 0,
      transaction_date: formData.transaction_date 
        ? new Date(formData.transaction_date).toISOString() 
        : null,
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
          
          {/* 订单号 */}
          <div>
            <label className="form-label">订单号 *</label>
            <input
              type="text"
              value={formData.order_number}
              onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
              className="form-input"
              required
              disabled={!!order}  // 编辑时锁死
            />
          </div>

          {/* 商品 */}
          <div>
            <label className="form-label">商品 *</label>
            {
              // 编辑时：显示锁死的商品名称和 SKU
              <input
                type="text"
                value={`${products.find(p => p.id)?.name || ''} - ${products.find(p => p.id)?.sku || ''} (库存: ${products.find(p => p.id)?.quantity})`}
                className="form-input"
                disabled
              />
            }
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

          {/* 销售渠道 */}
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

          {/* 订单状态 */}
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

          {/* 买家姓名 */}
          <div>
            <label className="form-label">买家姓名</label>
            <input
              type="text"
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              className="form-input"
            />
          </div>
          
          {/* 交易日期 */}
          <div>
            <label className="form-label">交易日期 * </label>
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

          {/* 按钮 */}
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
