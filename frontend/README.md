# Frontend (Next.js + Tailwind CSS + Recharts)

## 技术栈
- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS + 自定义组件样式
- **图表**: Recharts
- **HTTP客户端**: Axios
- **表单**: React Hook Form
- **通知**: React Hot Toast
- **图标**: Lucide React
- **语言**: TypeScript

## 项目结构
```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 根布局
│   └── page.tsx           # 首页
├── components/             # 可复用组件
│   ├── Layout.tsx         # 主布局组件
│   └── Sidebar.tsx        # 侧边栏导航
├── lib/                   # 工具库
│   └── api.ts             # API 客户端
├── styles/                # 样式文件
│   └── globals.css        # 全局样式
├── package.json           # 依赖配置
├── tailwind.config.js     # Tailwind 配置
├── tsconfig.json          # TypeScript 配置
└── postcss.config.js      # PostCSS 配置
```

## 安装和运行

### 1. 安装依赖
```bash
cd frontend
npm install
```

### 2. 环境配置
前端（Next.js）需要调用后端 API，比如 /products、/orders。

但前端代码不能直接写死 http://localhost:8000，因为：

开发环境下 → API 地址是 http://localhost:8000

部署到服务器后 → 可能是 https://myapp.com/api

* 创建 `.env.local` 文件：
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
部署后：`NEXT_PUBLIC_API_URL=https://e-commerce-backend.onrender.com`
### 3. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000` 查看前端界面

## 功能特性

### 已实现功能
- ✅ **响应式布局**: 支持桌面端和移动端
- ✅ **侧边栏导航**: 商品管理、订单管理、报表分析
- ✅ **API 客户端**: 统一的 HTTP 请求处理
- ✅ **错误处理**: 全局错误提示和网络状态监控
- ✅ **样式系统**: 基于 Tailwind 的自定义组件样式

### 待实现功能
- 🔄 **商品管理页面**: CRUD 操作和 CSV 导入
- 🔄 **订单管理页面**: 订单列表和创建
- 🔄 **报表分析页面**: 图表展示和数据筛选

## 样式系统

### 自定义组件类
- **按钮**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`
- **卡片**: `.card`, `.card-header`, `.card-body`
- **表单**: `.form-input`, `.form-label`, `.form-error`
- **表格**: `.table`, `.table-header`, `.table-cell`
- **徽章**: `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`

### 颜色主题
- **主色调**: Primary (蓝色系)
- **成功色**: Success (绿色系)
- **警告色**: Warning (黄色系)
- **危险色**: Danger (红色系)

## API 集成

### API 客户端功能
- **自动错误处理**: 统一显示错误提示
- **请求拦截**: 可添加认证 token
- **响应拦截**: 统一处理响应数据
- **超时设置**: 10秒请求超时

### 模块化 API
- `productApi`: 商品相关接口
- `orderApi`: 订单相关接口
- `reportApi`: 报表相关接口
- `systemApi`: 系统相关接口

## 开发说明

### 环境要求
- Node.js 18+
- npm 或 yarn

### 开发命令
```bash
npm run dev      # 开发模式
npm run build    # 构建生产版本
npm run start    # 启动生产版本
npm run lint     # 代码检查
```

### 注意事项
1. 确保后端服务已启动 (http://localhost:8000)
2. 前端会自动检测后端连接状态
3. 所有 API 请求都有统一的错误处理
4. 支持移动端响应式设计

dependency:
* next@14.0.4 - Next.js 框架
* react@^18.2.0 - React 库
* recharts@^2.8.0 - 图表库
* axios@^1.6.2 - HTTP 客户端
* react-hook-form@^7.48.2 - 表单处理
* react-hot-toast@^2.4.1 - 通知组件
* lucide-react@^0.294.0 - 图标库
* tailwindcss@^3.3.6 - CSS 框架