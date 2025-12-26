// 1. 初始化 APM (必须在引入其他模块之前)
const apm = require('elastic-apm-node').start({
  serviceName: 'local-backend-api',   // 服务名称，会在 Service Map 中显示
  serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200', // APM Server 地址
  environment: 'local',
});

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// 2. 允许跨域，以便前端 RUM 可以发起请求
app.use(cors());

// 3. 模拟一个简单的 API
app.get('/api/data', (req, res) => {
  // 模拟一些业务逻辑处理时间
  const span = apm.startSpan('process-data');
  setTimeout(() => {
    if (span) span.end();
    res.json({ message: 'Hello from Backend!', timestamp: new Date() });
  }, 200);
});

// 4. 模拟一个会报错的 API
app.get('/api/error', (req, res) => {
  const err = new Error('Backend database connection failed');
  apm.captureError(err);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
