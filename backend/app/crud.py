from sqlalchemy.orm import Session
from sqlalchemy import select
from . import models, schemas
from datetime import datetime


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


def list_orders(db: Session) -> list[models.Order]:
	stmt = select(models.Order).order_by(models.Order.id.desc())
	return list(db.execute(stmt).scalars().all())
