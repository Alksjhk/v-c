#!/usr/bin/env node

/**
 * 环境配置设置脚本
 * 用于快速设置不同环境的配置文件
 */

const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    VITE_API_BASE_URL: process.env.DEV_API_URL || 'http://localhost:3001',
    VITE_DEFAULT_API_URL: 'http://localhost:3001',
    VITE_API_TIMEOUT: process.env.API_TIMEOUT || '10000',
    VITE_NODE_ENV: 'development',
    VITE_ENABLE_LOGGING: 'true',
    VITE_ENABLE_DEBUG: 'true'
  },
  test: {
    VITE_API_BASE_URL: process.env.TEST_API_URL || 'https://test-api.example.com',
    VITE_DEFAULT_API_URL: 'https://test-api.example.com',
    VITE_API_TIMEOUT: process.env.API_TIMEOUT || '8000',
    VITE_NODE_ENV: 'test',
    VITE_ENABLE_LOGGING: 'false',
    VITE_ENABLE_DEBUG: 'false'
  },
  staging: {
    VITE_API_BASE_URL: process.env.STAGING_API_URL || 'https://staging-api.example.com',
    VITE_DEFAULT_API_URL: 'https://staging-api.example.com',
    VITE_API_TIMEOUT: process.env.API_TIMEOUT || '12000',
    VITE_NODE_ENV: 'staging',
    VITE_ENABLE_LOGGING: 'true',
    VITE_ENABLE_DEBUG: 'false'
  },
  production: {
    VITE_API_BASE_URL: process.env.PROD_API_URL || 'https://api.yourdomain.com',
    VITE_DEFAULT_API_URL: 'https://api.yourdomain.com',
    VITE_API_TIMEOUT: process.env.API_TIMEOUT || '15000',
    VITE_NODE_ENV: 'production',
    VITE_ENABLE_LOGGING: 'false',
    VITE_ENABLE_DEBUG: 'false'
  }
};

function createEnvFile(env) {
  const config = environments[env];
  if (!config) {
    console.error(`❌ 未知环境: ${env}`);
    console.log('可用环境:', Object.keys(environments).join(', '));
    process.exit(1);
  }

  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envFile = env === 'development' ? '.env' : `.env.${env}`;
  const envPath = path.join(__dirname, '..', envFile);

  fs.writeFileSync(envPath, envContent + '\n');
  console.log(`✅ 已创建 ${envFile} 文件`);
  console.log('配置内容:');
  console.log(envContent);
}

// 获取命令行参数
const env = process.argv[2];

if (!env) {
  console.log('使用方法: node setup-env.js <environment>');
  console.log('可用环境:', Object.keys(environments).join(', '));
  console.log('');
  console.log('示例:');
  console.log('  node setup-env.js development');
  console.log('  node setup-env.js production');
  process.exit(1);
}

createEnvFile(env);