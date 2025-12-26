import './style.css'
import { init as initApm } from '@elastic/apm-rum'

// 初始化 APM SDK
const apm = initApm({
  serviceName: 'local-test-app',
  serverUrl: 'http://localhost:8200',
  serviceVersion: '0.0.1',
  environment: 'local',
  // 关键配置：允许向哪些域发送分布式追踪头 (traceparent)
  // 这样当请求发往 localhost:3000 时，后端就能串联起整个链路
  distributedTracingOrigins: ['http://localhost:3000'],
})

// 模拟用户登录态
apm.setUserContext({
  id: 'your-uid',  // 替换为实际用户 ID
  did: 'aaa-xxx-vvv-dddd',
  username: 'user@example.com'  // 可选
});

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Elastic RUM Service Map Demo</h1>
    <div class="card">
      <button id="error-btn" type="button">Trigger Frontend Error</button>
      <button id="txn-btn" type="button">Frontend Transaction Only</button>
      <hr />
      <button id="api-btn" type="button">Call Backend API (Success)</button>
      <button id="api-err-btn" type="button">Call Backend API (Error)</button>
    </div>
    <div id="output" style="margin-top: 20px; color: #888;"></div>
  </div>
`

const outputDiv = document.querySelector('#output');
function log(msg) {
  outputDiv.innerText = msg;
  console.log(msg);
}

// 1. 触发前端错误
document.querySelector('#error-btn').addEventListener('click', () => {
  try {
    throw new Error('Frontend Test Error: ' + new Date().toISOString());
  } catch (err) {
    apm.captureError(err);
    log('Frontend Error captured!');
  }
})

// 2. 前端纯自定义事务
document.querySelector('#txn-btn').addEventListener('click', () => {
  const t = apm.startTransaction('pure-frontend-click', 'user-interaction');
  setTimeout(() => {
    t.end();
    log('Frontend Transaction finished.');
  }, 300);
})

// 3. 调用后端 API（测试 Service Map 连线）
document.querySelector('#api-btn').addEventListener('click', async () => {
  log('Calling Backend API...');
  
  // RUM 会自动拦截 fetch 请求并注入 traceparent 头
  try {
    const res = await fetch('http://localhost:3000/api/data');
    const data = await res.json();
    log('Response from Backend: ' + JSON.stringify(data));
  } catch (e) {
    log('Fetch failed: ' + e.message);
    apm.captureError(e);
  }
})

// 4. 调用后端 API 触发后端错误
document.querySelector('#api-err-btn').addEventListener('click', async () => {
  log('Calling Backend Error API...');
  try {
    const res = await fetch('http://localhost:3000/api/error');
    if (!res.ok) {
       log('Backend returned error status: ' + res.status);
    }
  } catch (e) {
    log('Fetch failed: ' + e.message);
  }
})
