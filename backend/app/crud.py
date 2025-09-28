from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from . import models, schemas
from datetime import datetime
from typing import Iterable, List
from decimal import Decimal
from fastapi import HTTPException


# ==================== Product CRUD ====================

def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    """创建商品"""
    product = models.Product(
        sku=data.sku,
        name=data.name,
        cost_price=Decimal(str(data.cost_price)),
        quantity=data.quantity,
        preset_price=Decimal(str(data.preset_price)) if data.preset_price is not None else None,
        actual_price=Decimal(str(data.actual_price)) if data.actual_price is not None else None,
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
        if field in ["cost_price", "preset_price", "actual_price"] and value is not None:
            value = Decimal(str(value))
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


# ==================== Order CRUD ====================

def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
    """创建订单（自动扣减库存并计算利润）"""
    product = get_product_by_sku(db, data.product_sku)
    if product is None:
        raise HTTPException(status_code=400, detail="不存在该商品")
    if product.quantity < data.quantity:
        raise HTTPException(status_code=400, detail="库存不足")

    # 计算利润：销售额 - 成本 （全部用 Decimal）
    total_sales = Decimal(str(data.actual_price)) * Decimal(str(data.quantity))
    total_cost = product.cost_price * Decimal(str(data.quantity))
    profit = total_sales - total_cost

    order = models.Order(
        order_number=data.order_number,
        created_at=datetime.utcnow(),
        transaction_date=data.transaction_date,
        buyer_name=data.buyer_name,
        actual_price=Decimal(str(data.actual_price)),
        quantity=data.quantity,
        profit=profit,
        payment_method=data.payment_method,
        channel=data.channel,
        status=data.status,
        product_id=product.id,
    )

    product.quantity -= data.quantity
    product.actual_price = Decimal(str(data.actual_price))

    db.add(order)
    db.add(product)
    db.commit()
    db.refresh(order)
    return order


def get_order_by_id(db: Session, order_id: int) -> models.Order | None:
    stmt = select(models.Order).where(models.Order.id == order_id)
    return db.execute(stmt).scalar_one_or_none()


def get_order_by_number(db: Session, order_number: str) -> models.Order | None:
    stmt = select(models.Order).where(models.Order.order_number == order_number)
    return db.execute(stmt).scalar_one_or_none()


def list_orders(db: Session) -> list[models.Order]:
    stmt = select(models.Order).order_by(models.Order.id.desc())
    return list(db.execute(stmt).scalars().all())


def update_order(db: Session, order: models.Order, data: schemas.OrderUpdate) -> models.Order:
    """更新订单信息并调整库存，重新计算利润"""
    product = order.product

    # 如果数量有变化，调整库存
    if data.quantity is not None and data.quantity != order.quantity:
        diff = data.quantity - order.quantity
        if diff > 0:
            if product.quantity < diff:
                raise HTTPException(status_code=400, detail="库存不足")
            product.quantity -= diff
        else:
            product.quantity += abs(diff)

    # 更新订单字段
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in ["actual_price", "profit"] and value is not None:
            value = Decimal(str(value))
        setattr(order, field, value)

    # 重新计算利润
    final_price = Decimal(str(data.actual_price)) if data.actual_price is not None else order.actual_price
    final_quantity = data.quantity if data.quantity is not None else order.quantity
    total_sales = final_price * Decimal(str(final_quantity))
    total_cost = product.cost_price * Decimal(str(final_quantity))
    order.profit = total_sales - total_cost

    db.add(order)
    db.add(product)
    db.commit()
    db.refresh(order)
    return order


def delete_order(db: Session, order: models.Order) -> None:
    """删除订单并自动恢复库存"""
    product = order.product
    product.quantity += order.quantity
    db.delete(order)
    db.add(product)
    db.commit()


def upsert_orders(db: Session, orders: Iterable[schemas.OrderCreate]) -> dict:
    """批量导入订单"""
    inserted = 0
    skipped = 0
    errors = []
    for payload in orders:
        try:
            existing = get_order_by_number(db, payload.order_number)
            if existing is not None:
                skipped += 1
                continue
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
