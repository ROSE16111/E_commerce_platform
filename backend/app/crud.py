from sqlalchemy.orm import Session
from sqlalchemy import select
from . import models, schemas
from datetime import datetime
from typing import Iterable


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
