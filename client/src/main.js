import './style.css'
import { init as initApm } from '@elastic/apm-rum'

// Web 端初始化 APM SDK
const apm = initApm({
  serviceName: 'local-test-app', // 必填：在 Kibana 中显示的服务名称，用于区分不同的应用
  serverUrl: 'http://localhost:8200', // 必填：APM Server 的地址，数据会上报到这里
  serviceVersion: '0.0.1', // 关键：用于匹配 Source Map 文件以通过堆栈还原源码，也是版本发布追踪的标识
  environment: 'local', // 选填：部署环境（如 'production', 'staging'），用于在 Kibana 中过滤数据
  distributedTracingOrigins: ['http://localhost:3000'], // 分布式追踪设置：只有发往这些域名的请求才会自动附带 traceparent 头
})

// 模拟用户登录态
apm.setUserContext({
  id: 'your-uid',  // 替换为实际用户 ID
  username: 'user@example.com'  // 可选
});

// 设置设备标识作为自定义上下文
apm.addLabels({
  device_id: 'aaa-xxx-vvv-dddd'
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
