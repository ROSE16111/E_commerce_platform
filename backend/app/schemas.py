from datetime import datetime, date
from typing import Optional, List, Dict, Any
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


class OrderUpdate(BaseModel):
	"""订单更新模型 - 允许部分字段更新"""
	transaction_date: Optional[datetime] = None
	buyer_name: Optional[str] = None
	actual_price: Optional[float] = Field(default=None, ge=0)
	quantity: Optional[int] = Field(default=None, ge=1)
	payment_method: Optional[PaymentMethod] = None
	channel: Optional[Channel] = None
	status: Optional[OrderStatus] = None


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


# ==================== 报表相关 Schemas ====================

class ReportFilters(BaseModel):
	"""报表筛选条件"""
	start_date: Optional[date] = None
	end_date: Optional[date] = None
	channels: Optional[List[Channel]] = None
	payment_methods: Optional[List[PaymentMethod]] = None
	statuses: Optional[List[OrderStatus]] = None
	product_skus: Optional[List[str]] = None
	group_by: Optional[str] = Field(default="day", description="day/week/month/channel/product")


class SalesSummary(BaseModel):
	"""销售汇总"""
	total_sales: float = Field(description="总销售额")
	total_cost: float = Field(description="总成本")
	total_profit: float = Field(description="总利润")
	total_orders: int = Field(description="总订单数")
	total_quantity: int = Field(description="总销售数量")
	profit_margin: float = Field(description="利润率 (%)")


class ChannelStats(BaseModel):
	"""渠道统计"""
	channel: Channel
	total_sales: float
	total_cost: float
	total_profit: float
	order_count: int
	profit_margin: float


class ProductStats(BaseModel):
	"""商品统计"""
	product_sku: str
	product_name: str
	total_sales: float
	total_cost: float
	total_profit: float
	quantity_sold: int
	order_count: int
	profit_margin: float


class TimeSeriesData(BaseModel):
	"""时间序列数据"""
	date: str
	total_sales: float
	total_cost: float
	total_profit: float
	order_count: int


class ReportResponse(BaseModel):
	"""报表响应"""
	summary: SalesSummary
	channel_stats: List[ChannelStats]
	product_stats: List[ProductStats]
	time_series: List[TimeSeriesData]
	filters_applied: ReportFilters
	generated_at: datetime


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


class OrderUpdate(BaseModel):
	"""订单更新模型 - 允许部分字段更新"""
	transaction_date: Optional[datetime] = None
	buyer_name: Optional[str] = None
	actual_price: Optional[float] = Field(default=None, ge=0)
	quantity: Optional[int] = Field(default=None, ge=1)
	payment_method: Optional[PaymentMethod] = None
	channel: Optional[Channel] = None
	status: Optional[OrderStatus] = None


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
