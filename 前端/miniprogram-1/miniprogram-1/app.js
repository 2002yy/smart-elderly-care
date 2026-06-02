// app.js
const config = require('./config');

App({
  onLaunch: function () {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
    
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        this.globalData.networkType = res.networkType;
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络连接不可用，请检查网络设置',
            icon: 'none',
            duration: 3000
          });
        }
      }
    });
    
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.globalData.networkType = res.networkType;
      if (!res.isConnected) {
        wx.showToast({
          title: '网络连接已断开',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },
  
  globalData: {
    userInfo: null,
    baseUrl: config.baseUrl,
    networkType: 'unknown',
    selectedServiceStatus: undefined
  }
}); 