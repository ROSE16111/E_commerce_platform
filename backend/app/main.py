from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .database import Base, engine, get_db
from . import schemas, crud

app = FastAPI(title="E-commerce ERP (Lite)")


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


@app.patch("/products/{sku}", response_model=schemas.ProductOut)
def update_product(sku: str, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
	product = crud.get_product_by_sku(db, sku)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	return crud.update_product(db, product, payload)


# Orders
@app.post("/orders", response_model=schemas.OrderOut)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
	try:
		return crud.create_order(db, payload)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@app.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
	return crud.list_orders(db)
