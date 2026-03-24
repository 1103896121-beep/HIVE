# 构建阶段
FROM node:20-slim AS build-stage

WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package*.json ./
RUN npm install

# 注入环境变量（由于 Vite 环境变量在构建时硬编码，需要在此处定义）
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# 复制所有源代码并构建
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:stable-alpine AS production-stage

# 从构建阶段复制构建好的静态文件
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制自定义 nginx 配置（如果需要的话，这里使用默认）
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
