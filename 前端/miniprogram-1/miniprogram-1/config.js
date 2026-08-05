// Source-tree development defaults.
// `npm run build` replaces the dist copy with MINIPROGRAM_API_BASE_URL.
const config = {
  baseUrl: 'http://127.0.0.1:8081',
  apis: {
    login: '/login',
    services: '/api/services',
    bindings: '/api/bindings',
    emergency: '/api/emergency'
  }
};

module.exports = config;
