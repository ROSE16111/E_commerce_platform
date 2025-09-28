'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { systemApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOnline, setIsOnline] = useState(false)

  // 检查后端连接状态
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await systemApi.healthCheck()
        setIsOnline(true)
      } catch (error) {
        setIsOnline(false)
        toast.error('无法连接到后端服务，请确保后端已启动')
      }
    }

    checkConnection()
    
    // 每30秒检查一次连接状态
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 连接状态指示器 */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${isOnline 
            ? 'bg-success-100 text-success-800' 
            : 'bg-danger-100 text-danger-800'
          }
        `}>
          {isOnline ? '● 已连接' : '● 未连接'}
        </div>
      </div>

      <div className="flex">
        {/* 侧边栏 */}
        <Sidebar />
        
        {/* 主内容区域 */}
        <main className="flex-1 lg:ml-0">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
