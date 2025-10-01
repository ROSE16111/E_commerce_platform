'use client'
import { useState } from 'react'

interface Product {
  id: number
  sku: string
  name: string
  cost_price: number
  quantity: number
  preset_price?: number
  actual_price?: number
}

export default function OrderModal({
  product,   // ✅ 直接传入当前商品
  onSubmit,
  onClose
}: {
  product: Product
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  // 初始化表单数据
  const [formData, setFormData] = useState({
    product_sku: product.sku, // 锁死商品
    actual_price: product.preset_price?.toString() || '', // 默认用预售价
    quantity: '1',
    payment_method: 'cash',
    channel: 'Facebook',
    status: 'pending',
    buyer_name: '',
    transaction_date: '',
    remark: ''
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
        <h3 className="text-lg font-semibold mb-4">新增订单</h3>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 商品（锁死显示） */}
          <div>
            <label className="form-label">商品 *</label>
            <input
              type="text"
              value={`${product.name} - ${product.sku} (库存: ${product.quantity})`}
              className="form-input"
              disabled
            />
          </div>

          {/* 实际售价（默认预售价，可编辑） */}
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
            <button type="submit" className="btn-success flex-1">创建</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">取消</button>
          </div>
        </form>
      </div>
    </div>
  )
}
