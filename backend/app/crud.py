from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from . import models, schemas
from datetime import datetime
from typing import Iterable, List
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import Column,Text

# ==================== Product CRUD ====================

def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    """创建商品"""
    # 用户输入的是前缀，例如 "XXX"
    prefix = data.sku.strip()  
     # 找出数据库里已有的同前缀 SKU
    existing = db.query(models.Product).filter(models.Product.sku.like(f"{prefix}_%")).all()

    # 自动生成下一个序号
    next_num = len(existing) + 1
    new_sku = f"{prefix}_{next_num:03d}"

    product = models.Product(
        sku=new_sku,
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
     # ✅ 如果成本价更新了，自动重算该商品的所有订单利润
    if data.cost_price is not None:
        orders = db.query(models.Order).filter(models.Order.product_id == product.id).all()
        for order in orders:
            # 这里用 order 本身的数据，调用 update_order 来重算利润
            update_data = schemas.OrderUpdate(
                actual_price=order.actual_price,
                quantity=order.quantity,
                payment_method=order.payment_method,
                channel=order.channel,
                status=order.status,
                buyer_name=order.buyer_name,
                transaction_date=order.transaction_date,
                remark=order.remark,
            )
            update_order(db, order, update_data)

        db.commit()
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
    
    # 查询该商品已有多少订单
    existing_orders = (
        db.query(models.Order)
        .filter(models.Order.product_id == product.id)
        .with_entities(models.Order.order_number)
        .all()
    )

    # 找最大编号
    max_suffix = 0
    for o in existing_orders:
        if o.order_number and "_" in o.order_number:
            try:
                suffix = int(o.order_number.split("_")[-1])
                max_suffix = max(max_suffix, suffix)
            except:
                pass
    new_order_number = f"{product.sku}_{max_suffix + 1:03d}"

    order = models.Order(
        order_number=new_order_number,
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
        remark = data.remark,
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
from datetime import datetime
from collections import defaultdict
from . import models, schemas
from datetime import datetime, timedelta
def generate_comprehensive_report(db, filters: schemas.ReportFilters):
    """
    生成综合报表
    - 汇总统计
    - 渠道统计
    - 商品统计
    - 时间序列统计
    """

    query = db.query(models.Order).join(models.Product, models.Order.product_id == models.Product.id)

    # ===== 应用筛选条件 =====
    if filters.start_date:
        start_datetime = datetime.combine(filters.start_date, datetime.min.time())
        query = query.filter(models.Order.transaction_date >= start_datetime)
    if filters.end_date:
        end_datetime = datetime.combine(filters.end_date, datetime.max.time())
        query = query.filter(models.Order.transaction_date <= end_datetime)
    if filters.channels and len(filters.channels) > 0:
        query = query.filter(models.Order.channel.in_(filters.channels))
    if filters.payment_methods and len(filters.payment_methods) > 0:
        query = query.filter(models.Order.payment_method.in_(filters.payment_methods))
    if filters.statuses and len(filters.statuses) > 0:
        query = query.filter(models.Order.status.in_(filters.statuses))
    if filters.product_skus and len(filters.product_skus) > 0:
        query = query.filter(models.Product.sku.in_(filters.product_skus))   # ✅ 改成从 Product 表里筛 SKU
    # ✅ 调试输出
    from sqlalchemy.dialects import postgresql
    print("Filters Debug:", filters.start_date, filters.end_date)
    compiled = query.statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
    print("Generated SQL:", compiled)

    orders = query.all()

    # ===== 汇总统计 =====
    total_sales = sum(float(o.actual_price) * o.quantity for o in orders)
    total_cost = sum(float(o.product.cost_price) * o.quantity for o in orders if o.product)
    total_profit = sum(float(o.profit) for o in orders)
    total_orders = len(orders)
    total_quantity = sum(o.quantity for o in orders)
    profit_margin = (total_profit / total_sales * 100) if total_sales > 0 else 0

    summary = schemas.SalesSummary(
        total_sales=total_sales,
        total_cost=total_cost,
        total_profit=total_profit,
        total_orders=total_orders,
        total_quantity=total_quantity,
        profit_margin=profit_margin,
    )

    # ===== 渠道统计 =====
    channel_stats_dict = defaultdict(lambda: {
        "total_sales": 0.0,
        "total_cost": 0.0,
        "total_profit": 0.0,
        "order_count": 0,
        "quantity": 0,
    })

    for o in orders:
        cs = channel_stats_dict[o.channel]
        cs["total_sales"] += float(o.actual_price) * o.quantity
        cs["total_cost"] += float(o.product.cost_price) * o.quantity if o.product else 0
        cs["total_profit"] += float(o.profit)
        cs["order_count"] += 1
        cs["quantity"] += o.quantity

    channel_stats = [
        schemas.ChannelStats(
            channel=channel,
            total_sales=data["total_sales"],
            total_cost=data["total_cost"],
            total_profit=data["total_profit"],
            order_count=data["order_count"],
            profit_margin=(data["total_profit"] / data["total_sales"] * 100) if data["total_sales"] > 0 else 0,
        )
        for channel, data in channel_stats_dict.items()
    ]

    # ===== 商品统计 =====
    product_stats_dict = defaultdict(lambda: {
        "product_name": "",
        "total_sales": 0.0,
        "total_cost": 0.0,
        "total_profit": 0.0,
        "quantity_sold": 0,
        "order_count": 0,
    })

    for o in orders:
        sku = o.product.sku if o.product else "未知SKU"   # ✅ 从 Product 拿 SKU
        ps = product_stats_dict[sku]
        ps["product_name"] = o.product.name if o.product else "未知商品"
        ps["total_sales"] += float(o.actual_price) * o.quantity
        ps["total_cost"] += float(o.product.cost_price) * o.quantity if o.product else 0
        ps["total_profit"] += float(o.profit)
        ps["quantity_sold"] += o.quantity
        ps["order_count"] += 1

    product_stats = [
        schemas.ProductStats(
            product_sku=sku,
            product_name=data["product_name"],
            total_sales=data["total_sales"],
            total_cost=data["total_cost"],
            total_profit=data["total_profit"],
            quantity_sold=data["quantity_sold"],
            order_count=data["order_count"],
            profit_margin=(data["total_profit"] / data["total_sales"] * 100) if data["total_sales"] > 0 else 0,
        )
        for sku, data in product_stats_dict.items()
    ]

    # ===== 时间序列统计（按天） =====
    time_series_dict = defaultdict(lambda: {
        "total_sales": 0.0,
        "total_cost": 0.0,
        "total_profit": 0.0,
        "order_count": 0,
    })

    for o in orders:
        if o.transaction_date:
            day = o.transaction_date.date().isoformat()
            ts = time_series_dict[day]
            ts["total_sales"] += float(o.actual_price) * o.quantity
            ts["total_cost"] += float(o.product.cost_price) * o.quantity if o.product else 0
            ts["total_profit"] += float(o.profit)
            ts["order_count"] += 1

    time_series = [
        schemas.TimeSeriesData(
            date=day,
            total_sales=data["total_sales"],
            total_cost=data["total_cost"],
            total_profit=data["total_profit"],
            order_count=data["order_count"],
        )
        for day, data in sorted(time_series_dict.items())
    ]

    # ===== 最终响应 =====
    return schemas.ReportResponse(
        summary=summary,
        channel_stats=channel_stats,
        product_stats=product_stats,
        time_series=time_series,
        filters_applied=filters,
        generated_at=datetime.utcnow(),
    )
