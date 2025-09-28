'use client'

import Layout from '@/components/Layout'
import { Package, ShoppingCart, BarChart3, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const stats = [
  {
    name: '商品总数',
    value: '0',
    icon: Package,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    href: '/products',
  },
  {
    name: '订单总数',
    value: '0',
    icon: ShoppingCart,
    color: 'text-success-600',
    bgColor: 'bg-success-100',
    href: '/orders',
  },
  {
    name: '总销售额',
    value: '¥0',
    icon: TrendingUp,
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    href: '/reports',
  },
  {
    name: '报表分析',
    value: '查看',
    icon: BarChart3,
    color: 'text-danger-600',
    bgColor: 'bg-danger-100',
    href: '/reports',
  },
]

export default function HomePage() {
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

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.name}
              href={stat.href}
              className="card hover:shadow-md transition-shadow duration-200"
            >
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            </Link>
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
