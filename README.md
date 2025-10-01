# E_commerce_platform
* 平台：轻量级 ERP 企业资源计划（Enterprise Resource Planning）- 进销存+订单管理
* target用户: 小规模电商 + 多平台销售
* goals: 
  * 整合：不同平台的商品信息、订单数据、库存情况集中管理。
  * 简化：减少重复上架、手工统计，让小商户专注于卖货而不是做表格。
  * 可视化：销售额、利润、库存一眼可见

* 网址： https://ecommerce-frontend.qs16111.workers.dev
### V 0.1.0
初步可以使用，导入商品CSV还不能自动识别已存在的，导入订单CSV逻辑还有点问题，暂时不建议用
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
  * 字段：订单号，创建日期，交易日期，买家名字，实际售价，支付方式（cash/payid）, 渠道标记（eBay/Facebook/other），状态（pending/done）,商品，商品数量，利润
  * logic:
    * 新订单创建→ 库存减少，自动计算利润
    * 订单更新→ 重新计算利润
    * 删除订单→ 库存自动恢复
    * 每单都与商品 SKU 关联
    * 利润 = 销售额 - 成本 = (实际售价 × 数量) - (成本价 × 数量)
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

# cursor to do list：
1. Scaffold FastAPI backend with DB models and app entry
2. Add Postgres via docker-compose for local development
3. Implement Product module: CRUD and CSV import
4. Implement Order module: create/list with inventory decrement and CSV import
5. Implement Reports: sales, cost, profit with filters
6. Initialize Next.js frontend with Tailwind and Recharts
7. Build UI pages: Products, Orders, Reports; wire APIs
8. Add sample CSVs and update README with usage steps

## 
* 导入 CSV 模板与规则
  * upsert_products

必填表头: sku,name,cost_price,quantity
可选表头: preset_price,actual_price
数字列允许空值（会按空处理）
e.g. 
```
sku,name,cost_price,quantity,preset_price,actual_price
SKU001,T-Shirt,20,100,39.9,
SKU002,Cap,10,50,19.9,18.0
```
导入为“幂等”式：已存在 SKU 将更新，不存在则创建。返回统计 inserted/updated

  * upsert_orders
必填字段 order_number, product_sku, actual_price, quantity, payment_method, channel, status
```
order_number,product_sku,actual_price,quantity,payment_method,channel,status,transaction_date,buyer_name
ORD001,SKU001,39.9,2,cash,eBay,done,2024-01-15,张三
ORD002,SKU002,19.9,1,payid,Facebook,pending,2024-01-16,李四
```
* .gitignore: 忽略缓存、虚拟环境、日志、Docker、前端 node_modules 等