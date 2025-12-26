FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

# 启动时先上传 Source Maps，成功后再启动预览服务器
# 使用环境变量 APM_SERVER_URL 指定 APM 服务器地址（默认为 Docker 网络内部地址）
CMD ["sh", "-c", "node scripts/upload-sourcemaps.cjs --server ${APM_SERVER_URL:-http://apm-server:8200} && npm run preview -- --host"]
