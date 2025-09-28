from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from .models import PaymentMethod, Channel, OrderStatus


class ProductBase(BaseModel):
	sku: str
	name: str
	cost_price: float = Field(ge=0)
	quantity: int = Field(ge=0)
	preset_price: Optional[float] = Field(default=None, ge=0)
	actual_price: Optional[float] = Field(default=None, ge=0)


class ProductCreate(ProductBase):
	pass


class ProductUpdate(BaseModel):
	name: Optional[str] = None
	cost_price: Optional[float] = Field(default=None, ge=0)
	quantity: Optional[int] = Field(default=None, ge=0)
	preset_price: Optional[float] = Field(default=None, ge=0)
	actual_price: Optional[float] = Field(default=None, ge=0)


class ProductOut(ProductBase):
	id: int

	class Config:
		from_attributes = True


class OrderBase(BaseModel):
	order_number: str
	transaction_date: Optional[datetime] = None
	buyer_name: Optional[str] = None
	actual_price: float = Field(ge=0)
	quantity: int = Field(ge=1)
	payment_method: PaymentMethod
	channel: Channel
	status: OrderStatus
	product_sku: str


class OrderCreate(OrderBase):
	pass


class OrderOut(BaseModel):
	id: int
	order_number: str
	created_at: datetime
	transaction_date: Optional[datetime]
	buyer_name: Optional[str]
	actual_price: float
	quantity: int
	payment_method: PaymentMethod
	channel: Channel
	status: OrderStatus
	product_id: int

	class Config:
		from_attributes = True
