from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import csv
import io

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
	try:
		return crud.create_order(db, payload)
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))


@app.get("/orders", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
	return crud.list_orders(db)
