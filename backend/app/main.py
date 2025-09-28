from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import csv
import io
from datetime import datetime
from typing import Optional, List

from .database import Base, engine, get_db
from . import schemas, crud

app = FastAPI(title="E-commerce ERP (Lite)")

# CORS 问题（跨域）
# FastAPI 默认没开跨域，前端直接 fetch 可能被浏览器拦截
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或者只允许 ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
	Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
	return {"status": "ok"}


# Products
@app.post("/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
	try:
		return crud.create_product(db, payload)
	except IntegrityError:
		raise HTTPException(status_code=400, detail="SKU already exists")


@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
	return crud.list_products(db)


@app.get("/products/{sku}", response_model=schemas.ProductOut)
def get_product(sku: str, db: Session = Depends(get_db)):
	product = crud.get_product_by_sku(db, sku)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	return product


@app.patch("/products/{sku}", response_model=schemas.ProductOut)
def update_product(sku: str, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
	product = crud.get_product_by_sku(db, sku)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	return crud.update_product(db, product, payload)


@app.delete("/products/{sku}", status_code=204)
def delete_product(sku: str, db: Session = Depends(get_db)):
	product = crud.get_product_by_sku(db, sku)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	crud.delete_product(db, product)
	return None


@app.post("/products/import/csv")
def import_products_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
	if not file.filename.lower().endswith(".csv"):
		raise HTTPException(status_code=400, detail="Only CSV files are supported")
	content = file.file.read().decode("utf-8-sig")
	reader = csv.DictReader(io.StringIO(content))
	required = {"sku", "name", "cost_price", "quantity"}
	missing = required - set([h.strip() for h in reader.fieldnames or []])
	if missing:
		raise HTTPException(status_code=400, detail=f"Missing headers: {', '.join(sorted(missing))}")

	items: list[schemas.ProductCreate] = []
	row_index = 1
	for row in reader:
		row_index += 1
		try:
			payload = schemas.ProductCreate(
				sku=row.get("sku", "").strip(),
				name=row.get("name", "").strip(),
				cost_price=float(row.get("cost_price", 0) or 0),
				quantity=int(row.get("quantity", 0) or 0),
				preset_price=float(row.get("preset_price")) if row.get("preset_price") else None,
				actual_price=float(row.get("actual_price")) if row.get("actual_price") else None,
			)
			items.append(payload)
		except Exception as e:
			raise HTTPException(status_code=400, detail=f"Row {row_index} invalid: {e}")

	stats = crud.upsert_products(db, items)
	return {"total": len(items), **stats}


# Orders
@app.post("/orders", response_model=schemas.OrderOut)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
	"""创建新订单
	- 自动扣减商品库存
	- 更新商品的 actual_price 为订单价格
	- 如果库存不足会返回错误
	"""
	try:
		return crud.create_order(db, payload)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@app.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
	"""获取所有订单列表，按创建时间倒序"""
	return crud.list_orders(db)


@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
	"""根据订单ID查询单个订单"""
	order = crud.get_order_by_id(db, order_id)
	if not order:
		raise HTTPException(status_code=404, detail="Order not found")
	return order


@app.get("/orders/by-number/{order_number}", response_model=schemas.OrderOut)
def get_order_by_number(order_number: str, db: Session = Depends(get_db)):
	"""根据订单号查询单个订单"""
	order = crud.get_order_by_number(db, order_number)
	if not order:
		raise HTTPException(status_code=404, detail="Order not found")
	return order


@app.patch("/orders/{order_id}", response_model=schemas.OrderOut)
def update_order(order_id: int, payload: schemas.OrderUpdate, db: Session = Depends(get_db)):
	"""更新订单信息
	注意：更新订单不会影响库存，如需调整库存请单独处理商品
	"""
	order = crud.get_order_by_id(db, order_id)
	if not order:
		raise HTTPException(status_code=404, detail="Order not found")
	return crud.update_order(db, order, payload)


@app.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
	"""删除订单
	警告：删除订单不会恢复库存，请谨慎操作
	"""
	order = crud.get_order_by_id(db, order_id)
	if not order:
		raise HTTPException(status_code=404, detail="Order not found")
	crud.delete_order(db, order)
	return None


@app.post("/orders/import/csv")
def import_orders_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
	"""批量导入订单CSV文件
	支持的CSV格式：
	- 必填字段：order_number, product_sku, actual_price, quantity, payment_method, channel, status
	- 可选字段：transaction_date, buyer_name
	- 如果订单号已存在会跳过该订单
	- 如果商品SKU不存在或库存不足会记录错误
	"""
	if not file.filename.lower().endswith(".csv"):
		raise HTTPException(status_code=400, detail="Only CSV files are supported")
	
	content = file.file.read().decode("utf-8-sig")
	reader = csv.DictReader(io.StringIO(content))
	
	# 检查必填字段
	required = {"order_number", "product_sku", "actual_price", "quantity", "payment_method", "channel", "status"}
	missing = required - set([h.strip() for h in reader.fieldnames or []])
	if missing:
		raise HTTPException(status_code=400, detail=f"Missing required headers: {', '.join(sorted(missing))}")

	items: list[schemas.OrderCreate] = []
	row_index = 1
	
	for row in reader:
		row_index += 1
		try:
			# 解析日期字段（如果存在）
			transaction_date = None
			if row.get("transaction_date"):
				try:
					transaction_date = datetime.fromisoformat(row["transaction_date"].replace("Z", "+00:00"))
				except ValueError:
					# 尝试其他日期格式
					from datetime import datetime
					for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y"]:
						try:
							transaction_date = datetime.strptime(row["transaction_date"], fmt)
							break
						except ValueError:
							continue
					if transaction_date is None:
						raise ValueError(f"Invalid date format: {row['transaction_date']}")
			
			payload = schemas.OrderCreate(
				order_number=row.get("order_number", "").strip(),
				transaction_date=transaction_date,
				buyer_name=row.get("buyer_name", "").strip() or None,
				actual_price=float(row.get("actual_price", 0) or 0),
				quantity=int(row.get("quantity", 1) or 1),
				payment_method=row.get("payment_method", "").strip().lower(),
				channel=row.get("channel", "").strip(),
				status=row.get("status", "").strip().lower(),
				product_sku=row.get("product_sku", "").strip(),
			)
			items.append(payload)
		except Exception as e:
			raise HTTPException(status_code=400, detail=f"Row {row_index} invalid: {e}")

	# 批量处理订单
	stats = crud.upsert_orders(db, items)
	return {
		"message": "CSV import completed",
		"total_rows": len(items),
		**stats
	}


# ==================== 报表模块 ====================
from fastapi import Body

@app.post("/reports/comprehensive", response_model=schemas.ReportResponse)
def generate_comprehensive_report(
	filters: schemas.ReportFilters = Body(...),  # 明确告诉 FastAPI 从请求体读取
	db: Session = Depends(get_db)
):
	"""生成综合报表
	包含：
	- 销售汇总（总销售额、成本、利润、订单数等）
	- 渠道统计（各渠道销售情况）
	- 商品统计（各商品销售排行）
	- 时间序列数据（按日期统计）
	
	支持的筛选条件：
	- 日期范围：start_date, end_date
	- 渠道：channels (eBay/Facebook/other)
	- 支付方式：payment_methods (cash/payid)
	- 订单状态：statuses (pending/done)
	- 商品SKU：product_skus
	"""
	return crud.generate_comprehensive_report(db, filters)


@app.get("/reports/summary", response_model=schemas.SalesSummary)
def get_sales_summary(
	start_date: Optional[str] = None,
	end_date: Optional[str] = None,
	channels: Optional[str] = None,
	payment_methods: Optional[str] = None,
	statuses: Optional[str] = None,
	product_skus: Optional[str] = None,
	db: Session = Depends(get_db)
):
	"""获取销售汇总数据
	查询参数：
	- start_date: 开始日期 (YYYY-MM-DD)
	- end_date: 结束日期 (YYYY-MM-DD)
	- channels: 渠道，多个用逗号分隔 (eBay,Facebook,other)
	- payment_methods: 支付方式，多个用逗号分隔 (cash,payid)
	- statuses: 订单状态，多个用逗号分隔 (pending,done)
	- product_skus: 商品SKU，多个用逗号分隔
	"""
	# 解析查询参数
	filters = schemas.ReportFilters()
	
	if start_date:
		filters.start_date = datetime.fromisoformat(start_date).date()
	if end_date:
		filters.end_date = datetime.fromisoformat(end_date).date()
	
	if channels:
		filters.channels = [c.strip() for c in channels.split(",")]
	if payment_methods:
		filters.payment_methods = [p.strip() for p in payment_methods.split(",")]
	if statuses:
		filters.statuses = [s.strip() for s in statuses.split(",")]
	if product_skus:
		filters.product_skus = [s.strip() for s in product_skus.split(",")]
	
	return crud.calculate_sales_summary(db, filters)


@app.get("/reports/channels", response_model=List[schemas.ChannelStats])
def get_channel_stats(
	start_date: Optional[str] = None,
	end_date: Optional[str] = None,
	channels: Optional[str] = None,
	payment_methods: Optional[str] = None,
	statuses: Optional[str] = None,
	product_skus: Optional[str] = None,
	db: Session = Depends(get_db)
):
	"""获取渠道统计数据
	按渠道分组统计销售情况，按销售额降序排列
	"""
	# 解析查询参数
	filters = schemas.ReportFilters()
	
	if start_date:
		filters.start_date = datetime.fromisoformat(start_date).date()
	if end_date:
		filters.end_date = datetime.fromisoformat(end_date).date()
	
	if channels:
		filters.channels = [c.strip() for c in channels.split(",")]
	if payment_methods:
		filters.payment_methods = [p.strip() for p in payment_methods.split(",")]
	if statuses:
		filters.statuses = [s.strip() for s in statuses.split(",")]
	if product_skus:
		filters.product_skus = [s.strip() for s in product_skus.split(",")]
	
	return crud.calculate_channel_stats(db, filters)


@app.get("/reports/products", response_model=List[schemas.ProductStats])
def get_product_stats(
	start_date: Optional[str] = None,
	end_date: Optional[str] = None,
	channels: Optional[str] = None,
	payment_methods: Optional[str] = None,
	statuses: Optional[str] = None,
	product_skus: Optional[str] = None,
	db: Session = Depends(get_db)
):
	"""获取商品统计数据
	按商品分组统计销售情况，按销售额降序排列
	"""
	# 解析查询参数
	filters = schemas.ReportFilters()
	
	if start_date:
		filters.start_date = datetime.fromisoformat(start_date).date()
	if end_date:
		filters.end_date = datetime.fromisoformat(end_date).date()
	
	if channels:
		filters.channels = [c.strip() for c in channels.split(",")]
	if payment_methods:
		filters.payment_methods = [p.strip() for p in payment_methods.split(",")]
	if statuses:
		filters.statuses = [s.strip() for s in statuses.split(",")]
	if product_skus:
		filters.product_skus = [s.strip() for s in product_skus.split(",")]
	
	return crud.calculate_product_stats(db, filters)


@app.get("/reports/timeseries", response_model=List[schemas.TimeSeriesData])
def get_time_series_data(
	start_date: Optional[str] = None,
	end_date: Optional[str] = None,
	channels: Optional[str] = None,
	payment_methods: Optional[str] = None,
	statuses: Optional[str] = None,
	product_skus: Optional[str] = None,
	db: Session = Depends(get_db)
):
	"""获取时间序列数据
	按日期分组统计销售情况，用于绘制趋势图
	"""
	# 解析查询参数
	filters = schemas.ReportFilters()
	
	if start_date:
		filters.start_date = datetime.fromisoformat(start_date).date()
	if end_date:
		filters.end_date = datetime.fromisoformat(end_date).date()
	
	if channels:
		filters.channels = [c.strip() for c in channels.split(",")]
	if payment_methods:
		filters.payment_methods = [p.strip() for p in payment_methods.split(",")]
	if statuses:
		filters.statuses = [s.strip() for s in statuses.split(",")]
	if product_skus:
		filters.product_skus = [s.strip() for s in product_skus.split(",")]
	
	return crud.calculate_time_series(db, filters)
