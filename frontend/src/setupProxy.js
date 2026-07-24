const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target = `http://127.0.0.1:${process.env.BACKEND_PORT || 4000}`;
  app.use('/api', createProxyMiddleware({ target, changeOrigin: true }));
};
