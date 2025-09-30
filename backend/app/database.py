import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 优先使用 Render 提供的 DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")

# 如果本地开发没设置 DATABASE_URL，就 fallback 到 docker-compose 的配置
if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER", "ecom_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "ecom_pass")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "ecommerce")

    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 创建数据库引擎
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# 获取数据库 session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
