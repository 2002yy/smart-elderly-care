// pages/login.js
const config = require('../../config.js');

Page({
  data: {
    isLoading: false
  },

  /**
   * 处理微信登录事件
   * @param {Object} e - 事件对象
   * @param {Object} e.detail.userInfo - 用户信息对象
   * 
   * 处理流程：
   * 1. 检查用户是否授权
   * 2. 如果已授权，执行微信登录
   * 3. 如果未授权，显示提示信息
   */
  handleWechatLogin(e) {
    // 微信新版本不再返回userInfo，直接进行登录
    this.setData({ isLoading: true });
    
    // 调用 wx.login 方法进行登录
    wx.login({
      success: (res) => {
        // 登录成功，获取code
        if (res.code) {
          // 发送code到服务器，以供后续验证
          this.sendCodeToServer(res.code);
        } else {
          console.error('登录失败', res.errMsg);
          this.showError('获取登录凭证失败，请重试');
        }
      },
      fail: (res) => {
        // 登录失败，提示用户重试或联系客服
        console.error('登录失败', res.errMsg);
        this.showError('微信登录失败，请重试');
      },
      complete: () => {
        if (this.data.isLoading) {
          this.setData({ isLoading: false });
        }
      }
    });
  },

  /**
   * 将code发送到后端服务器
   * @param {string} code - 用户的临时登录凭证
   */
  sendCodeToServer(code) {
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 将code发送到后端服务器
    wx.request({
      url: `http://localhost:8081/login`,
      method: 'POST',
      data: {
        code: code
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 登录成功，服务器返回的数据通常包含用户的 openid 和自定义登录态（如 token）
          const { token, userInfo, serviceInfo, emergencyInfo, bindInfo } = res.data;
          
          // 存储数据到本地
          this.storeUserData(token, userInfo, serviceInfo, emergencyInfo, bindInfo);
          
          // 根据用户类型跳转
          this.navigateAfterLogin(userInfo);
        } else {
          // 登录失败，提示用户
          console.error('登录失败', res);
          this.showError(res.data && res.data.message ? res.data.message : '登录失败，请重试');
        }
      },
      fail: (err) => {
        // 请求失败，提示用户
        console.error('请求失败', err);
        this.showError('服务器连接失败，请检查网络或联系管理员');
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  /**
   * 存储用户数据到本地存储
   */
  storeUserData(token, userInfo, serviceInfo, emergencyInfo, bindInfo) {
    try {
      wx.setStorageSync('token', token);
      wx.setStorageSync('userInfo', userInfo);
      
      // 确保数据是数组，即使是空的
      wx.setStorageSync('serviceInfo', Array.isArray(serviceInfo) ? serviceInfo : []);
      wx.setStorageSync('emergencyInfo', Array.isArray(emergencyInfo) ? emergencyInfo : []);
      wx.setStorageSync('bindInfo', Array.isArray(bindInfo) ? bindInfo : []);
      
      console.log('用户数据已存储', {
        userInfo,
        serviceCount: serviceInfo ? serviceInfo.length : 0,
        bindCount: bindInfo ? bindInfo.length : 0
      });
    } catch (e) {
      console.error('存储数据失败', e);
    }
  },

  /**
   * 根据用户类型导航到相应页面
   */
  navigateAfterLogin(userInfo) {
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    // 根据用户类型跳转
    if (userInfo.userType !== 99) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    } else {
      wx.navigateTo({
        url: '/pages/signup/signup'
      });
    }
  },

  /**
   * 显示错误信息
   */
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    });
  }
}); 