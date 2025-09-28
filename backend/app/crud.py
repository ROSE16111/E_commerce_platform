from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_
from . import models, schemas
from datetime import datetime, date, timedelta
from typing import Iterable, List, Dict, Any
from decimal import Decimal


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
	"""创建商品"""
	product = models.Product(
		sku=data.sku,
		name=data.name,
		cost_price=data.cost_price,
		quantity=data.quantity,
		preset_price=data.preset_price,
		actual_price=data.actual_price,
	)
	db.add(product)
	db.commit()
	db.refresh(product)
	return product


def get_product_by_sku(db: Session, sku: str) -> models.Product | None:
	"""根据SKU查询商品"""
	stmt = select(models.Product).where(models.Product.sku == sku)
	return db.execute(stmt).scalar_one_or_none()


def list_products(db: Session) -> list[models.Product]:
	"""获取商品列表"""
	stmt = select(models.Product).order_by(models.Product.id.desc())
	return list(db.execute(stmt).scalars().all())


def update_product(db: Session, product: models.Product, data: schemas.ProductUpdate) -> models.Product:
	"""更新商品信息"""
	for field, value in data.model_dump(exclude_unset=True).items():
		setattr(product, field, value)
	db.add(product)
	db.commit()
	db.refresh(product)
	return product


def delete_product(db: Session, product: models.Product) -> None:
	"""删除商品"""
	db.delete(product)
	db.commit()


def upsert_products(db: Session, products: Iterable[schemas.ProductCreate]) -> dict:
	"""批量导入商品（CSV导入用）"""
	inserted = 0
	updated = 0
	for payload in products:
		existing = get_product_by_sku(db, payload.sku)
		if existing is None:
			create_product(db, payload)
			inserted += 1
		else:
			update_product(
				db,
				existing,
				schemas.ProductUpdate(
					name=payload.name,
					cost_price=payload.cost_price,
					quantity=payload.quantity,
					preset_price=payload.preset_price,
					actual_price=payload.actual_price,
				),
			)
			updated += 1
	return {"inserted": inserted, "updated": updated}


def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
	"""创建订单（自动扣减库存）"""
	product = get_product_by_sku(db, data.product_sku)
	if product is None:
		raise ValueError("Product with given SKU not found")
	if product.quantity < data.quantity:
		raise ValueError("Insufficient inventory")

	order = models.Order(
		order_number=data.order_number,
		created_at=datetime.utcnow(),
		transaction_date=data.transaction_date,
		buyer_name=data.buyer_name,
		actual_price=data.actual_price,
		quantity=data.quantity,
		payment_method=data.payment_method,
		channel=data.channel,
		status=data.status,
		product_id=product.id,
	)

	product.quantity = product.quantity - data.quantity
	product.actual_price = data.actual_price

	db.add(order)
	db.add(product)
	db.commit()
	db.refresh(order)
	return order


def get_order_by_id(db: Session, order_id: int) -> models.Order | None:
	"""根据订单ID查询单个订单"""
	stmt = select(models.Order).where(models.Order.id == order_id)
	return db.execute(stmt).scalar_one_or_none()


def get_order_by_number(db: Session, order_number: str) -> models.Order | None:
	"""根据订单号查询单个订单"""
	stmt = select(models.Order).where(models.Order.order_number == order_number)
	return db.execute(stmt).scalar_one_or_none()


def list_orders(db: Session) -> list[models.Order]:
	"""获取所有订单列表，按创建时间倒序"""
	stmt = select(models.Order).order_by(models.Order.id.desc())
	return list(db.execute(stmt).scalars().all())


def update_order(db: Session, order: models.Order, data: schemas.OrderUpdate) -> models.Order:
	"""更新订单信息"""
	for field, value in data.model_dump(exclude_unset=True).items():
		setattr(order, field, value)
	db.add(order)
	db.commit()
	db.refresh(order)
	return order


def delete_order(db: Session, order: models.Order) -> None:
	"""删除订单（注意：删除订单不会恢复库存，需要谨慎操作）"""
	db.delete(order)
	db.commit()


def upsert_orders(db: Session, orders: Iterable[schemas.OrderCreate]) -> dict:
	"""批量导入订单（CSV导入用）
	注意：如果订单号已存在，会跳过该订单以避免重复
	"""
	inserted = 0
	skipped = 0
	errors = []
	
	for payload in orders:
		try:
			# 检查订单号是否已存在
			existing = get_order_by_number(db, payload.order_number)
			if existing is not None:
				skipped += 1
				continue
				
			# 创建新订单（会自动扣减库存）
			create_order(db, payload)
			inserted += 1
		except ValueError as e:
			errors.append(f"订单 {payload.order_number}: {str(e)}")
	
	return {
		"inserted": inserted, 
		"skipped": skipped, 
		"errors": errors,
		"total_processed": inserted + skipped + len(errors)
	}


# ==================== 报表相关 CRUD 函数 ====================

def get_orders_with_filters(db: Session, filters: schemas.ReportFilters) -> List[models.Order]:
	"""根据筛选条件获取订单数据"""
	stmt = select(models.Order).join(models.Product)
	
	# 构建筛选条件
	conditions = []
	
	# 日期筛选
	if filters.start_date:
		conditions.append(models.Order.transaction_date >= filters.start_date)
	if filters.end_date:
		# 结束日期包含整天
		end_datetime = datetime.combine(filters.end_date, datetime.max.time())
		conditions.append(models.Order.transaction_date <= end_datetime)
	
	# 渠道筛选
	if filters.channels:
		conditions.append(models.Order.channel.in_(filters.channels))
	
	# 支付方式筛选
	if filters.payment_methods:
		conditions.append(models.Order.payment_method.in_(filters.payment_methods))
	
	# 状态筛选
	if filters.statuses:
		conditions.append(models.Order.status.in_(filters.statuses))
	
	# 商品SKU筛选
	if filters.product_skus:
		conditions.append(models.Product.sku.in_(filters.product_skus))
	
	# 应用筛选条件
	if conditions:
		stmt = stmt.where(and_(*conditions))
	
	# 按交易日期排序
	stmt = stmt.order_by(models.Order.transaction_date.asc())
	
	return list(db.execute(stmt).scalars().all())


def calculate_sales_summary(db: Session, filters: schemas.ReportFilters) -> schemas.SalesSummary:
	"""计算销售汇总数据"""
	orders = get_orders_with_filters(db, filters)
	
	total_sales = 0.0
	total_cost = 0.0
	total_orders = len(orders)
	total_quantity = 0
	
	for order in orders:
		sales_amount = float(order.actual_price * order.quantity)
		cost_amount = float(order.product.cost_price * order.quantity)
		
		total_sales += sales_amount
		total_cost += cost_amount
		total_quantity += order.quantity
	
	total_profit = total_sales - total_cost
	profit_margin = (total_profit / total_sales * 100) if total_sales > 0 else 0.0
	
	return schemas.SalesSummary(
		total_sales=round(total_sales, 2),
		total_cost=round(total_cost, 2),
		total_profit=round(total_profit, 2),
		total_orders=total_orders,
		total_quantity=total_quantity,
		profit_margin=round(profit_margin, 2)
	)


def calculate_channel_stats(db: Session, filters: schemas.ReportFilters) -> List[schemas.ChannelStats]:
	"""计算渠道统计数据"""
	orders = get_orders_with_filters(db, filters)
	
	# 按渠道分组统计
	channel_data = {}
	for order in orders:
		channel = order.channel
		if channel not in channel_data:
			channel_data[channel] = {
				'total_sales': 0.0,
				'total_cost': 0.0,
				'order_count': 0
			}
		
		sales_amount = float(order.actual_price * order.quantity)
		cost_amount = float(order.product.cost_price * order.quantity)
		
		channel_data[channel]['total_sales'] += sales_amount
		channel_data[channel]['total_cost'] += cost_amount
		channel_data[channel]['order_count'] += 1
	
	# 转换为响应格式
	channel_stats = []
	for channel, data in channel_data.items():
		total_profit = data['total_sales'] - data['total_cost']
		profit_margin = (total_profit / data['total_sales'] * 100) if data['total_sales'] > 0 else 0.0
		
		channel_stats.append(schemas.ChannelStats(
			channel=channel,
			total_sales=round(data['total_sales'], 2),
			total_cost=round(data['total_cost'], 2),
			total_profit=round(total_profit, 2),
			order_count=data['order_count'],
			profit_margin=round(profit_margin, 2)
		))
	
	return sorted(channel_stats, key=lambda x: x.total_sales, reverse=True)


def calculate_product_stats(db: Session, filters: schemas.ReportFilters) -> List[schemas.ProductStats]:
	"""计算商品统计数据"""
	orders = get_orders_with_filters(db, filters)
	
	# 按商品分组统计
	product_data = {}
	for order in orders:
		sku = order.product.sku
		if sku not in product_data:
			product_data[sku] = {
				'product_name': order.product.name,
				'total_sales': 0.0,
				'total_cost': 0.0,
				'quantity_sold': 0,
				'order_count': 0
			}
		
		sales_amount = float(order.actual_price * order.quantity)
		cost_amount = float(order.product.cost_price * order.quantity)
		
		product_data[sku]['total_sales'] += sales_amount
		product_data[sku]['total_cost'] += cost_amount
		product_data[sku]['quantity_sold'] += order.quantity
		product_data[sku]['order_count'] += 1
	
	# 转换为响应格式
	product_stats = []
	for sku, data in product_data.items():
		total_profit = data['total_sales'] - data['total_cost']
		profit_margin = (total_profit / data['total_sales'] * 100) if data['total_sales'] > 0 else 0.0
		
		product_stats.append(schemas.ProductStats(
			product_sku=sku,
			product_name=data['product_name'],
			total_sales=round(data['total_sales'], 2),
			total_cost=round(data['total_cost'], 2),
			total_profit=round(total_profit, 2),
			quantity_sold=data['quantity_sold'],
			order_count=data['order_count'],
			profit_margin=round(profit_margin, 2)
		))
	
	return sorted(product_stats, key=lambda x: x.total_sales, reverse=True)


def calculate_time_series(db: Session, filters: schemas.ReportFilters) -> List[schemas.TimeSeriesData]:
	"""计算时间序列数据"""
	orders = get_orders_with_filters(db, filters)
	
	# 按日期分组统计
	date_data = {}
	for order in orders:
		if order.transaction_date:
			date_key = order.transaction_date.date()
		else:
			date_key = order.created_at.date()
		
		if date_key not in date_data:
			date_data[date_key] = {
				'total_sales': 0.0,
				'total_cost': 0.0,
				'order_count': 0
			}
		
		sales_amount = float(order.actual_price * order.quantity)
		cost_amount = float(order.product.cost_price * order.quantity)
		
		date_data[date_key]['total_sales'] += sales_amount
		date_data[date_key]['total_cost'] += cost_amount
		date_data[date_key]['order_count'] += 1
	
	# 转换为响应格式并按日期排序
	time_series = []
	for date_key, data in sorted(date_data.items()):
		total_profit = data['total_sales'] - data['total_cost']
		
		time_series.append(schemas.TimeSeriesData(
			date=date_key.isoformat(),
			total_sales=round(data['total_sales'], 2),
			total_cost=round(data['total_cost'], 2),
			total_profit=round(total_profit, 2),
			order_count=data['order_count']
		))
	
	return time_series


def generate_comprehensive_report(db: Session, filters: schemas.ReportFilters) -> schemas.ReportResponse:
	"""生成综合报表"""
	summary = calculate_sales_summary(db, filters)
	channel_stats = calculate_channel_stats(db, filters)
	product_stats = calculate_product_stats(db, filters)
	time_series = calculate_time_series(db, filters)
	
	return schemas.ReportResponse(
		summary=summary,
		channel_stats=channel_stats,
		product_stats=product_stats,
		time_series=time_series,
		filters_applied=filters,
		generated_at=datetime.utcnow()
	)


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
	product = models.Product(
		sku=data.sku,
		name=data.name,
		cost_price=data.cost_price,
		quantity=data.quantity,
		preset_price=data.preset_price,
		actual_price=data.actual_price,
	)
	db.add(product)
	db.commit()
	db.refresh(product)
	return product


def get_product_by_sku(db: Session, sku: str) -> models.Product | None:
	stmt = select(models.Product).where(models.Product.sku == sku)
	return db.execute(stmt).scalar_one_or_none()


def list_products(db: Session) -> list[models.Product]:
	stmt = select(models.Product).order_by(models.Product.id.desc())
	return list(db.execute(stmt).scalars().all())


def update_product(db: Session, product: models.Product, data: schemas.ProductUpdate) -> models.Product:
	for field, value in data.model_dump(exclude_unset=True).items():
		setattr(product, field, value)
	db.add(product)
	db.commit()
	db.refresh(product)
	return product


def delete_product(db: Session, product: models.Product) -> None:
	db.delete(product)
	db.commit()


def upsert_products(db: Session, products: Iterable[schemas.ProductCreate]) -> dict:
	inserted = 0
	updated = 0
	for payload in products:
		existing = get_product_by_sku(db, payload.sku)
		if existing is None:
			create_product(db, payload)
			inserted += 1
		else:
			update_product(
				db,
				existing,
				schemas.ProductUpdate(
					name=payload.name,
					cost_price=payload.cost_price,
					quantity=payload.quantity,
					preset_price=payload.preset_price,
					actual_price=payload.actual_price,
				),
			)
			updated += 1
	return {"inserted": inserted, "updated": updated}


def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
	product = get_product_by_sku(db, data.product_sku)
	if product is None:
		raise ValueError("Product with given SKU not found")
	if product.quantity < data.quantity:
		raise ValueError("Insufficient inventory")

	order = models.Order(
		order_number=data.order_number,
		created_at=datetime.utcnow(),
		transaction_date=data.transaction_date,
		buyer_name=data.buyer_name,
		actual_price=data.actual_price,
		quantity=data.quantity,
		payment_method=data.payment_method,
		channel=data.channel,
		status=data.status,
		product_id=product.id,
	)

	product.quantity = product.quantity - data.quantity
	product.actual_price = data.actual_price

	db.add(order)
	db.add(product)
	db.commit()
	db.refresh(order)
	return order


def get_order_by_id(db: Session, order_id: int) -> models.Order | None:
	"""根据订单ID查询单个订单"""
	stmt = select(models.Order).where(models.Order.id == order_id)
	return db.execute(stmt).scalar_one_or_none()


def get_order_by_number(db: Session, order_number: str) -> models.Order | None:
	"""根据订单号查询单个订单"""
	stmt = select(models.Order).where(models.Order.order_number == order_number)
	return db.execute(stmt).scalar_one_or_none()


def list_orders(db: Session) -> list[models.Order]:
	"""获取所有订单列表，按创建时间倒序"""
	stmt = select(models.Order).order_by(models.Order.id.desc())
	return list(db.execute(stmt).scalars().all())


def update_order(db: Session, order: models.Order, data: schemas.OrderUpdate) -> models.Order:
	"""更新订单信息"""
	for field, value in data.model_dump(exclude_unset=True).items():
		setattr(order, field, value)
	db.add(order)
	db.commit()
	db.refresh(order)
	return order


def delete_order(db: Session, order: models.Order) -> None:
	"""删除订单（注意：删除订单不会恢复库存，需要谨慎操作）"""
	db.delete(order)
	db.commit()


def upsert_orders(db: Session, orders: Iterable[schemas.OrderCreate]) -> dict:
	"""批量导入订单（CSV导入用）
	注意：如果订单号已存在，会跳过该订单以避免重复
	"""
	inserted = 0
	skipped = 0
	errors = []
	
	for payload in orders:
		try:
			# 检查订单号是否已存在
			existing = get_order_by_number(db, payload.order_number)
			if existing is not None:
				skipped += 1
				continue
				
			# 创建新订单（会自动扣减库存）
			create_order(db, payload)
			inserted += 1
		except ValueError as e:
			errors.append(f"订单 {payload.order_number}: {str(e)}")
	
	return {
		"inserted": inserted, 
		"skipped": skipped, 
		"errors": errors,
		"total_processed": inserted + skipped + len(errors)
	}
