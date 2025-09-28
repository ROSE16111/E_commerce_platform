# Backend （FastAPI + DB-Postgres + Docker）
使用数据库模型和应用程序入口搭建 FastAPI 后端
## Setup
1. Create and activate a virtual environment.
`conda create --prefix E:\E_commerce_platform\venv python=3.10 -y`
`conda activate E:\E_commerce_platform\venv`
2. Install dependencies:

```
pip install -r backend/requirements.txt
```

3. Start Postgres (recommended via docker-compose):
定义本地开发用的 Postgres 数据库（本机不安装），docker-compose.yml
启动数据库：下载 Postgres 镜像，启动一个 Postgres 容器，后端的 database.py 就能连上数据库了
```
docker compose up -d db
or 
docker compose -f backend/docker-compose.yml up -d db
```

4. Run the API server:
启用后端api, 进入 backend/ 目录，运行 FastAPI 应用
```
uvicorn backend.app.main:app --reload
```
访问`http://127.0.0.1:8000/docs`能看到自动生成的 API 文档
- Health check: `GET /health`
- Products: `POST /products`, `GET /products`, `PATCH /products/{sku}`
- Orders: `POST /orders`, `GET /orders`

# file
* requirements.txt

记录项目需要的 Python 库，比如 fastapi, sqlalchemy, psycopg2。

以后别人只要 pip install -r requirements.txt 就能装好依赖。

* docker-compose.yml
一键启动数据库

定义本地开发用的 Postgres 数据库（而不是你自己本机安装 Postgres）。

以后只要运行 docker compose up，Postgres 数据库就跑起来了。

Docker 就是一个 “软件容器”，可以把数据库、应用环境打包成一个“独立的小盒子”。

你只要运行一条命令，Postgres 数据库就会自动跑起来，不用自己去下载安装配置。

* database.py

数据库连接代码（连接到 Postgres）。

* models.py

数据表的定义（比如 Product、Order）。

相当于你在代码里写出“表结构”。

* schemas.py

用于定义接口的输入输出的数据格式（FastAPI 用 Pydantic schemas 来做验证）。

比如 ProductCreate、OrderResponse。

* main.py

FastAPI 的入口文件，运行整个后端 API 的地方。产品路由：列表、新增、查单个、更新、删除

* POST /products/import/csv：读取 CSV、校验表头、解析为 ProductCreate、批量 upsert

* crud.py
  * GET /products 列表
  * POST /products 新增
  * GET /products/{sku} 查询单个
  * PATCH /products/{sku} 更新
  * DELETE /products/{sku} 删除
  * POST /products/import/csv 导入CSV（multipart/form-data，字段名 file）