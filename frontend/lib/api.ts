'use client'

import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      const message = error.response.data?.detail || error.response.data?.message || '请求失败'
      toast.error(message)
    } else if (error.request) {
      toast.error('网络连接失败，请检查后端服务是否启动')
    } else {
      toast.error('请求配置错误')
    }
    return Promise.reject(error)
  }
)

// 商品相关 API
export const productApi = {
  // 获取商品列表
  getProducts: () => api.get('/products'),
  
  // 获取单个商品
  getProduct: (sku: string) => api.get(`/products/${sku}`),
  
  // 创建商品
  createProduct: (data: any) => api.post('/products', data),
  
  // 更新商品
  updateProduct: (sku: string, data: any) => api.patch(`/products/${sku}`, data),
  
  // 删除商品
  deleteProduct: (sku: string) => api.delete(`/products/${sku}`),
  
  // 导入商品CSV
  importProducts: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/products/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

// 订单相关 API
export const orderApi = {
  // 获取订单列表
  getOrders: () => api.get('/orders'),
  
  // 获取单个订单
  getOrder: (id: number) => api.get(`/orders/${id}`),
  
  // 根据订单号获取订单
  getOrderByNumber: (orderNumber: string) => api.get(`/orders/by-number/${orderNumber}`),
  
  // 创建订单
  createOrder: (data: any) => api.post('/orders', data),
  
  // 更新订单
  updateOrder: (id: number, data: any) => api.patch(`/orders/${id}`, data),
  
  // 删除订单
  deleteOrder: (id: number) => api.delete(`/orders/${id}`),
  
  // 导入订单CSV
  importOrders: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/orders/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
}

// 报表相关 API
export const reportApi = {
  // 获取综合报表
  getComprehensiveReport: (filters?: any) =>  axios.post('http://localhost:8000/reports/comprehensive', filters),  // ✅ 用 post + body
  
  // 获取销售汇总
  getSalesSummary: (params?: any) => api.get('/reports/summary', { params }),
  
  // 获取渠道统计
  getChannelStats: (params?: any) => api.get('/reports/channels', { params }),
  
  // 获取商品统计
  getProductStats: (params?: any) => api.get('/reports/products', { params }),
  
  // 获取时间序列数据
  getTimeSeriesData: (params?: any) => api.get('/reports/timeseries', { params }),
}

// 系统相关 API
export const systemApi = {
  // 健康检查
  healthCheck: () => api.get('/health'),
}

export default api
