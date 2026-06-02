// config.js - 小程序的全局配置

// 环境配置
const ENV = 'dev';  // 可选值: 'dev', 'prod'

const config = {
  // 后端API基础URL - 根据环境选择不同的URL
  baseUrl: ENV === 'dev' ? 'http://localhost:8081' : 'https://47.109.145.84:8081',
  
  // API端点
  apis: {
    login: '/login',
    services: '/api/services',
    bindings: '/api/bindings',
    emergency: '/api/emergency'
  }
};

module.exports = config; 