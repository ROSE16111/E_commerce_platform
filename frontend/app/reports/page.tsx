'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { reportApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  BarChart3, 
  TrendingUp, 
  Filter,
  Download,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface ReportData {
  summary: {
    total_sales: number
    total_cost: number
    total_profit: number
    total_orders: number
    total_quantity: number
    profit_margin: number
  }
  channel_stats: Array<{
    channel: string
    total_sales: number
    total_cost: number
    total_profit: number
    order_count: number
    profit_margin: number
  }>
  product_stats: Array<{
    product_sku: string
    product_name: string
    total_sales: number
    total_cost: number
    total_profit: number
    quantity_sold: number
    order_count: number
    profit_margin: number
  }>
  time_series: Array<{
    date: string
    total_sales: number
    total_cost: number
    total_profit: number
    order_count: number
  }>
  filters_applied: any
  generated_at: string
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    channels: [] as string[],
    payment_methods: [] as string[],
    statuses: [] as string[],
    product_skus: [] as string[]
  })

  // 获取报表数据
  const fetchReportData = async () => {
    try {
      setLoading(true)
  
      // 过滤掉空字符串
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      )
  
      const response = await reportApi.getComprehensiveReport(cleanFilters)
      setReportData(response.data)
    } catch (error) {
      toast.error("获取报表失败")
      console.error('获取报表数据失败:', error)
    } finally {
      setLoading(false)
    }
  }
  

  useEffect(() => {
    fetchReportData()
  }, [])

  // 应用筛选条件
  const handleApplyFilters = () => {
    fetchReportData()
    setShowFilters(false)
  }

  // 重置筛选条件
  const handleResetFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      channels: [],
      payment_methods: [],
      statuses: [],
      product_skus: []
    })
  }

  // 图表颜色配置
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <Layout>
      <div className="p-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-warning-600" />
            报表分析
          </h1>
          <p className="mt-2 text-gray-600">销售数据统计、利润分析和趋势预测</p>
        </div>

        {/* 操作栏 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1"></div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className="btn-secondary"
            >
              <Filter className="h-4 w-4 mr-2" />
              筛选条件
            </button>
            <button
              onClick={fetchReportData}
              className="btn-primary"
              disabled={loading}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {loading ? '加载中...' : '刷新数据'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2">加载报表数据...</span>
          </div>
        ) : reportData ? (
          <>
            {/* 汇总卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-primary-100">
                      <DollarSign className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">总销售额</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        ¥{reportData.summary.total_sales.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-success-100">
                      <TrendingUp className="h-6 w-6 text-success-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">总利润</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        ¥{reportData.summary.total_profit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-warning-100">
                      <ShoppingCart className="h-6 w-6 text-warning-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">订单总数</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {reportData.summary.total_orders}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-danger-100">
                      <Package className="h-6 w-6 text-danger-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">利润率</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {reportData.summary.profit_margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* 销售趋势图 */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">销售趋势</h3>
                </div>
                <div className="card-body">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.time_series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN')}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `¥${value.toFixed(2)}`, 
                            name === 'total_sales' ? '销售额' : 
                            name === 'total_cost' ? '成本' : '利润'
                          ]}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('zh-CN')}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="total_sales" 
                          stackId="1" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total_profit" 
                          stackId="2" 
                          stroke="#22c55e" 
                          fill="#22c55e" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 渠道对比图 */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">渠道销售对比</h3>
                </div>
                <div className="card-body">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.channel_stats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="total_sales"
                        >
                          {reportData.channel_stats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`¥${value.toFixed(2)}`, '销售额']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* 详细统计表格 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 渠道统计 */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">渠道统计</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">渠道</th>
                        <th className="table-header-cell">销售额</th>
                        <th className="table-header-cell">利润</th>
                        <th className="table-header-cell">订单数</th>
                        <th className="table-header-cell">利润率</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {reportData.channel_stats.map((stat, index) => (
                        <tr key={stat.channel}>
                          <td className="table-cell">
                            <span className={`badge ${index === 0 ? 'badge-primary' : index === 1 ? 'badge-success' : 'badge-secondary'}`}>
                              {stat.channel}
                            </span>
                          </td>
                          <td className="table-cell font-medium">¥{stat.total_sales.toFixed(2)}</td>
                          <td className="table-cell font-medium text-success-600">¥{stat.total_profit.toFixed(2)}</td>
                          <td className="table-cell">{stat.order_count}</td>
                          <td className="table-cell">{stat.profit_margin.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 商品统计 */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">热销商品</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">商品</th>
                        <th className="table-header-cell">销售额</th>
                        <th className="table-header-cell">销量</th>
                        <th className="table-header-cell">利润率</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {reportData.product_stats.slice(0, 5).map((stat, index) => (
                        <tr key={stat.product_sku}>
                          <td className="table-cell">
                            <div>
                              <div className="font-medium">{stat.product_name}</div>
                              <div className="text-sm text-gray-500 font-mono">{stat.product_sku}</div>
                            </div>
                          </td>
                          <td className="table-cell font-medium">¥{stat.total_sales.toFixed(2)}</td>
                          <td className="table-cell">{stat.quantity_sold}</td>
                          <td className="table-cell">{stat.profit_margin.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 筛选条件模态框 */}
            {showFilters && (
              <FilterModal
                filters={filters}
                setFilters={setFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无报表数据</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

// 筛选条件模态框
function FilterModal({ filters, setFilters, onApply, onReset, onClose }: {
  filters: any
  setFilters: (filters: any) => void
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  const handleChannelChange = (channel: string, checked: boolean) => {
    if (checked) {
      setFilters({ ...filters, channels: [...filters.channels, channel] })
    } else {
      setFilters({ ...filters, channels: filters.channels.filter((c: string) => c !== channel) })
    }
  }

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setFilters({ ...filters, payment_methods: [...filters.payment_methods, method] })
    } else {
      setFilters({ ...filters, payment_methods: filters.payment_methods.filter((m: string) => m !== method) })
    }
  }

  const handleStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setFilters({ ...filters, statuses: [...filters.statuses, status] })
    } else {
      setFilters({ ...filters, statuses: filters.statuses.filter((s: string) => s !== status) })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">筛选条件</h3>
        
        <div className="space-y-4">
          {/* 日期范围 */}
          <div>
            <label className="form-label">开始日期</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="form-input"
            />
          </div>
          
          <div>
            <label className="form-label">结束日期</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="form-input"
            />
          </div>

          {/* 渠道筛选 */}
          <div>
            <label className="form-label">销售渠道</label>
            <div className="space-y-2">
              {['eBay', 'Facebook', 'other'].map(channel => (
                <label key={channel} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.channels.includes(channel)}
                    onChange={(e) => handleChannelChange(channel, e.target.checked)}
                    className="mr-2"
                  />
                  {channel}
                </label>
              ))}
            </div>
          </div>

          {/* 支付方式筛选 */}
          <div>
            <label className="form-label">支付方式</label>
            <div className="space-y-2">
              {['cash', 'payid'].map(method => (
                <label key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.payment_methods.includes(method)}
                    onChange={(e) => handlePaymentMethodChange(method, e.target.checked)}
                    className="mr-2"
                  />
                  {method === 'cash' ? '现金' : 'PayID'}
                </label>
              ))}
            </div>
          </div>

          {/* 订单状态筛选 */}
          <div>
            <label className="form-label">订单状态</label>
            <div className="space-y-2">
              {['pending', 'done'].map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(status)}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                    className="mr-2"
                  />
                  {status === 'pending' ? '待处理' : '已完成'}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button onClick={onApply} className="btn-primary flex-1">
            应用筛选
          </button>
          <button onClick={onReset} className="btn-secondary flex-1">
            重置
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
