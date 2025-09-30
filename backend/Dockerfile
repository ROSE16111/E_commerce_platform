FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 拷贝依赖文件
COPY backend/requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 拷贝项目代码
COPY backend/ .

# 启动 FastAPI 应用
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
