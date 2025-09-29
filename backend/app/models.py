from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Enum, ForeignKey,Text
from sqlalchemy.orm import relationship

from .database import Base
import enum


class PaymentMethod(str, enum.Enum):
	cash = "cash"
	payid = "payid"


class Channel(str, enum.Enum):
	ebay = "eBay"
	facebook = "Facebook"
	saltFish = "saltFish"
	other = "other"


class OrderStatus(str, enum.Enum):
	pending = "pending"
	done = "done"


class Product(Base):
	__tablename__ = "products"

	id = Column(Integer, primary_key=True, index=True)
	sku = Column(String(64), unique=True, index=True, nullable=False)
	name = Column(String(255), nullable=False)
	cost_price = Column(Numeric(12, 2), nullable=False)
	quantity = Column(Integer, nullable=False, default=0)
	preset_price = Column(Numeric(12, 2), nullable=True)
	actual_price = Column(Numeric(12, 2), nullable=True)

	orders = relationship("Order", back_populates="product")


class Order(Base):
	__tablename__ = "orders"

	id = Column(Integer, primary_key=True, index=True)
	order_number = Column(String(64), unique=True, index=True, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	transaction_date = Column(DateTime, nullable=True)
	buyer_name = Column(String(255), nullable=True)
	actual_price = Column(Numeric(12, 2), nullable=False)
	quantity = Column(Integer, nullable=False, default=1)
	profit = Column(Numeric(12, 2), nullable=False, default=0)

	payment_method = Column(Enum(PaymentMethod), nullable=False)
	channel = Column(Enum(Channel), nullable=False)
	status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.pending)
	remark = Column(Text, nullable=True)  # 可为空的备注字段
	
	product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
	product = relationship("Product", back_populates="orders")
