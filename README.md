# E_commerce_platform
* 平台：轻量级 ERP 企业资源计划（Enterprise Resource Planning）- 进销存+订单管理
* target用户: 小规模电商 + 多平台销售
* goals: 
  * 整合：不同平台的商品信息、订单数据、库存情况集中管理。
  * 简化：减少重复上架、手工统计，让小商户专注于卖货而不是做表格。
  * 可视化：销售额、利润、库存一眼可见

## function
* 商品库（Product Module）
  * 手动或导入 Excel/CSV录入
  * 字段： SKU、名称，成本价、数量、预设售价，实际售价
  * logic: 
  * 每新增/修改商品 → 存数据库
  * 库存与订单挂钩：下单 → 库存自动减少
    * 库存自动随订单减少
* 订单录入（Order Module）
  * 支持“手动录入订单”或 支持“导入 CSV（eBay / PayPal）
  * 字段：订单号，创建日期，交易日期，买家名字，实际售价，支付方式（cash/payid）, 渠道标记（eBay/Facebook/other），状态（pending/done）
  * logic:
    * 新订单创建→ 库存减少
    * 每单都与商品 SKU 关联
* 简单报表 （Report & Analytics Module）
* 计算：
  * 已售商品成本 = ∑(成本价 × 数量)
  * 销售额 = ∑(实际售价 × 数量)
  * 利润 = 销售额 – 成本
* 筛选
  * 按渠道统计（eBay / FB / 线下）
  * 按日期统计（日/周/月）
  * 按选中的商品名称统计
* 展示
  * 表格视图
  * 简单柱状图/饼图（销售额、利润对比）

## 项目架构 & 技术栈分析 framework
技术栈选择
* frontend
React + TailwindCSS + Next.js + Recharts
* backend
FastAPI/Django 哪个简单方便选哪个
* Database
PostgreSQL
* Deployment
打算自己手动用Vercel,ai不用帮我