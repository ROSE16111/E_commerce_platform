'use client'

import Layout from '@/components/Layout'
import { Package, ShoppingCart, BarChart3, CircleDollarSign } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { reportApi } from '@/lib/api'

export default function HomePage() {
  // 定义 summary 状态
  const [summary, setSummary] = useState<{
    total_sales: number
    total_orders: number
    total_quantity: number
  } | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // 调用报表接口，不传过滤条件，获取整体汇总
        const response = await reportApi.getComprehensiveReport({})
        setSummary(response.data.summary)
      } catch (error) {
        console.error('获取首页汇总失败:', error)
      }
    }
    fetchSummary()
  }, [])

  // 动态统计卡片数据
  const stats = [
    {
      name: '售出商品总数',
      // 注意：summary.total_quantity 是卖出的数量，
      // 如果你要显示商品种类数，可以改用 productApi.getProducts().length
      value: summary ? summary.total_quantity : 0,
      icon: Package,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      name: '订单总数',
      value: summary ? summary.total_orders : 0,
      icon: ShoppingCart,
      color: 'bg-green-100 text-green-600',
    },
    {
      name: '总销售额',
      value: summary ? `¥${summary.total_sales.toFixed(2)}` : '¥0',
      icon: CircleDollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      name: '报表分析',
      value: '查看',
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-600',
    },
  ]
  return (
    <Layout>
      <div className="p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">欢迎使用电商ERP系统</h1>
          <p className="mt-2 text-gray-600">
            轻量级进销存管理系统，帮助小规模电商集中管理商品、订单和销售数据
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="card p-6 h-22 flex items-center shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center">
                <div className={`p-4 rounded-full ${stat.color} mr-4`}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 功能介绍 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 商品管理 */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-primary-600" />
                商品管理
              </h3>
            </div>
            <div className="card-body">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 商品信息录入和编辑</li>
                <li>• 库存数量管理</li>
                <li>• CSV批量导入商品</li>
                <li>• 成本价和售价设置</li>
              </ul>
              <Link href="/products" className="btn-primary mt-4">
                管理商品
              </Link>
            </div>
          </div>

          {/* 订单管理 */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-success-600" />
                订单管理
              </h3>
            </div>
            <div className="card-body">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 订单创建和编辑</li>
                <li>• 自动库存扣减</li>
                <li>• CSV批量导入订单</li>
                <li>• 多渠道订单管理</li>
              </ul>
              <Link href="/orders" className="btn-success mt-4">
                管理订单
              </Link>
            </div>
          </div>

          {/* 报表分析 */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-warning-600" />
                报表分析
              </h3>
            </div>
            <div className="card-body">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 销售数据统计</li>
                <li>• 利润分析</li>
                <li>• 渠道对比</li>
                <li>• 商品销售排行</li>
              </ul>
              <Link href="/reports" className="btn-warning mt-4">
                查看报表
              </Link>
            </div>
          </div>

          {/* 系统说明 */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">系统说明</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong>目标用户：</strong>小规模电商 + 多平台销售
                </p>
                <p>
                  <strong>核心功能：</strong>整合不同平台的商品信息、订单数据、库存情况
                </p>
                <p>
                  <strong>技术栈：</strong>Next.js + FastAPI + PostgreSQL
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
