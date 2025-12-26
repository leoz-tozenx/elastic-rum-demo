const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { glob } = require('glob');
const { parseArgs } = require('node:util');

// 解析命令行参数
const options = {
  service: { type: 'string' },
  version: { type: 'string' },
  base: { type: 'string' },
  dist: { type: 'string' },
  server: { type: 'string', default: 'http://localhost:8200' },
};

let args;
try {
  const { values } = parseArgs({ args: process.argv.slice(2), options });
  args = values;
} catch (e) {
  console.warn("Arg parsing failed, using hardcoded defaults");
  args = {}; 
}

const CONFIG = {
  serviceName: args.service || 'local-test-app',
  serviceVersion: args.version || '0.0.1',
  publicBaseUrl: args.base || 'http://localhost:4173',
  distDir: args.dist ? path.resolve(process.cwd(), args.dist) : path.resolve(__dirname, '../dist'),
  apmServerUrl: args.server || 'http://localhost:8200',
  // 从环境变量读取 Token (GitHub Secrets)
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
};

console.log('----------------------------------------');
console.log('🚀 Elastic RUM Sourcemap Uploader');
console.log(`Service      : ${CONFIG.serviceName}`);
console.log(`Version      : ${CONFIG.serviceVersion}`);
console.log(`APM Server   : ${CONFIG.apmServerUrl}`);
console.log('----------------------------------------');

async function uploadSourcemap(mapFile) {
  const formData = new FormData();
  const relativePath = path.relative(CONFIG.distDir, mapFile);
  const jsFilePath = relativePath.replace('.map', '');
  
  const cleanBase = CONFIG.publicBaseUrl.replace(/\/$/, '');
  const cleanPath = jsFilePath.replace(/^\//, '');
  const bundleFilepath = `${cleanBase}/${cleanPath}`;

  formData.append('service_name', CONFIG.serviceName);
  formData.append('service_version', CONFIG.serviceVersion);
  formData.append('bundle_filepath', bundleFilepath);
  formData.append('sourcemap', fs.createReadStream(mapFile));

  // 构造请求头
  const headers = { ...formData.getHeaders() };
  if (CONFIG.secretToken) {
    headers['Authorization'] = `Bearer ${CONFIG.secretToken}`;
  }

  try {
    process.stdout.write(`Uploading ${relativePath}... `);
    await axios.post(`${CONFIG.apmServerUrl}/assets/v1/sourcemaps`, formData, { headers });
    console.log(`✅ OK`);
  } catch (error) {
    console.log(`❌ FAIL`);
    if (error.response) {
      console.error(` -> Status: ${error.response.status}`);
      console.error(` -> Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(` -> Error: ${error.message}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(CONFIG.distDir)) {
    console.error(`❌ Dist directory not found: ${CONFIG.distDir}`);
    process.exit(1);
  }

  const mapFiles = await glob(`${CONFIG.distDir}/**/*.js.map`);
  
  if (mapFiles.length === 0) {
    console.warn('⚠️  No .js.map files found.');
    return;
  }

  console.log(`Found ${mapFiles.length} source maps.`);
  for (const file of mapFiles) {
    await uploadSourcemap(file);
  }
}

main();
