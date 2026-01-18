// API 配置
export const API_CONFIG = {
  // 开发环境：使用相对路径，由 Vite 代理到后端
  // 生产环境：需要配置完整的后端服务器 URL
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  env: import.meta.env.VITE_NODE_ENV || 'development'
}

// 环境类型检测
export const ENV_TYPES = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const

export type EnvType = typeof ENV_TYPES[keyof typeof ENV_TYPES]

// 环境检测工具
export const isEnvironment = (env: EnvType): boolean => {
  return API_CONFIG.env === env
}

export const isDevelopment = () => isEnvironment(ENV_TYPES.DEVELOPMENT)
export const isTest = () => isEnvironment(ENV_TYPES.TEST)
export const isStaging = () => isEnvironment(ENV_TYPES.STAGING)
export const isProduction = () => isEnvironment(ENV_TYPES.PRODUCTION)

// 根据环境调整配置
export const getEnvConfig = () => {
  const baseConfig = {
    enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
    enableErrorReporting: false,
    apiRetries: 1
  }

  switch (API_CONFIG.env) {
    case ENV_TYPES.DEVELOPMENT:
      return {
        ...baseConfig,
        enableLogging: true,
        enableDebug: true,
        apiRetries: 0 // 开发环境不重试，快速失败
      }
    
    case ENV_TYPES.TEST:
      return {
        ...baseConfig,
        enableLogging: false,
        enableDebug: false,
        apiRetries: 2
      }
    
    case ENV_TYPES.STAGING:
      return {
        ...baseConfig,
        enableLogging: true,
        enableDebug: false,
        enableErrorReporting: true,
        apiRetries: 2
      }
    
    case ENV_TYPES.PRODUCTION:
      return {
        ...baseConfig,
        enableLogging: false,
        enableDebug: false,
        enableErrorReporting: true,
        apiRetries: 3
      }
    
    default:
      return baseConfig
  }
}

// API 端点
export const API_ENDPOINTS = {
  chat: '/api/chat',
  upload: '/api/upload',
  history: '/api/history'
}