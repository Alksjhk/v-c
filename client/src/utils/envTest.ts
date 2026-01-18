// 环境变量测试工具
import { API_CONFIG, getEnvConfig, isDevelopment, isProduction, isTest, isStaging } from '../config/api';

export const testEnvironmentConfig = () => {
  const envConfig = getEnvConfig();
  
  console.group('🔧 环境配置信息');
  console.log('当前环境:', API_CONFIG.env);
  console.log('API Timeout:', API_CONFIG.timeout + 'ms');
  
  console.group('🎯 环境检测');
  console.log('是否开发环境:', isDevelopment());
  console.log('是否测试环境:', isTest());
  console.log('是否预发布环境:', isStaging());
  console.log('是否生产环境:', isProduction());
  console.groupEnd();
  
  console.group('⚙️ 环境特定配置');
  console.log('启用日志:', envConfig.enableLogging);
  console.log('启用调试:', envConfig.enableDebug);
  console.log('启用错误报告:', envConfig.enableErrorReporting);
  console.log('API 重试次数:', envConfig.apiRetries);
  console.groupEnd();
  
  console.group('🔍 原始环境变量');
  console.log('VITE_NODE_ENV:', import.meta.env.VITE_NODE_ENV);
  console.log('MODE:', import.meta.env.MODE);
  console.log('DEV:', import.meta.env.DEV);
  console.log('PROD:', import.meta.env.PROD);
  console.groupEnd();
  
  console.groupEnd();
  
  // 环境警告
  if (isProduction() && import.meta.env.DEV) {
    console.warn('⚠️ 警告：在开发模式下使用生产环境配置');
  }
  
  if (isDevelopment() && !import.meta.env.DEV) {
    console.warn('⚠️ 警告：在生产构建中使用开发环境配置');
  }
};

// 在开发环境下自动运行测试
if (isDevelopment() || import.meta.env.DEV) {
  testEnvironmentConfig();
}