# 使用 Python 3.10 基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖（由于使用 slim 镜像，可能需要额外安装一些库）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY . .

# 暴露端口（FastAPI 默认端口）
EXPOSE 8000

# 启动命令：使用 Gunicorn 配合 Uvicorn 工作进程，适合生产环境
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "app.main:app"]
