const app = getApp()

Page({
  data: {
    largeTextEnabled: false,
    talkBackEnabled: false,
    darkModeEnabled: false,
    needRestart: false
  },

  onLoad() {
    // 从本地存储加载所有设置状态
    this.setData({
      largeTextEnabled: wx.getStorageSync('largeTextEnabled') || false,
      talkBackEnabled: wx.getStorageSync('talkBackEnabled') || false,
      darkModeEnabled: wx.getStorageSync('darkModeEnabled') || false
    });
  },

  // 统一处理开关变更（仅关闭时弹窗确认）
  handleSwitchChange(e) {
    const { type } = e.currentTarget.dataset;
    const newValue = e.detail.value;
    
    if (type === 'largeText') {
      this.updateLargeTextSetting(newValue);
    } else {
      // 仅在关闭功能时显示确认弹窗
      if (!newValue) {
        const featureNames = {
          largeText: '大字版界面',
          talkBack: '读屏功能',
          darkMode: '暗黑模式'
        };
        
        wx.showModal({
          title: '确认关闭',
          content: `是否确认关闭${featureNames[type]}？`,
          success: (res) => {
            if (res.confirm) {
              this.updateSetting(type, newValue);
            } else {
              // 用户取消关闭，恢复开关状态
              this.setData({ [type + 'Enabled']: true });
            }
          }
        });
      } else {
        // 开启功能时直接更新，无需确认
        this.updateSetting(type, newValue);
      }
    }
  },

  // 统一更新设置的方法（确保showLoading与hideLoading配对）
  updateSetting(type, value) {
    wx.showLoading({ title: '设置中...' });
    
    // 调用后端API更新设置
    wx.request({
      url: `${app.globalData.baseUrl}/api/settings/accessibility`,
      method: 'POST',
      data: { [type + 'Enabled']: value },
      header: { 'Authorization': wx.getStorageSync('token') },
      success: (res) => {
        if (res.statusCode === 200) {
          // 更新本地存储和状态
          wx.setStorageSync(type + 'Enabled', value);
          this.setData({ [type + 'Enabled']: value });
          wx.showToast({ title: '设置成功', icon: 'success' });
        } else {
          throw new Error(res.data.message || '设置失败');
        }
      },
      fail: (err) => {
        console.error('设置失败：', err);
        wx.showToast({ title: '设置失败', icon: 'none' });
      },
      complete: () => {
        // 确保无论请求成功或失败都隐藏loading
        wx.hideLoading();
      }
    });
  },

  // 修复事件绑定问题 - 添加缺失的事件处理函数
  onTalkBackTap() {
    // 保持与switch组件一致的逻辑
    const currentValue = this.data.talkBackEnabled;
    this.setData({ talkBackEnabled: !currentValue });
  },

  onScreenReaderTap() {
    // 保持与switch组件一致的逻辑
    const currentValue = this.data.darkModeEnabled;
    this.setData({ darkModeEnabled: !currentValue });
  },

  // 阻止事件冒泡，防止点击开关时触发整行点击事件
  catchTapEvent(e) {
    e.stopPropagation();
  },

  // 点击整行切换大字版模式
  onLargeTextTap() {
    const currentValue = this.data.largeTextEnabled;
    this.updateLargeTextSetting(!currentValue);
  },

  // 更新大字版设置
  updateLargeTextSetting(value) {
    wx.showLoading({ title: '设置中...' });
    
    try {
      // 更新本地存储
      wx.setStorageSync('largeTextEnabled', value);
      
      // 更新全局字体大小
      this.updateGlobalFontSize(value);
      
      // 更新状态
      this.setData({ 
        largeTextEnabled: value,
        needRestart: true
      });
      
      wx.hideLoading();
      wx.showToast({ 
        title: '设置成功，重启生效', 
        icon: 'none',
        duration: 2000
      });
    } catch (err) {
      wx.hideLoading();
      console.error('设置失败：', err);
      wx.showToast({ 
        title: '设置失败', 
        icon: 'none' 
      });
    }
  },
  
  // 更新全局字体大小
  updateGlobalFontSize(isLargeText) {
    try {
      // 由于wx.setFontSizeSettings不可用，我们改用全局变量存储字体大小设置
      app.globalData.largeTextEnabled = isLargeText;
      
      // 创建或更新全局样式
      this.updateGlobalStyle(isLargeText);
      
      console.log('字体大小设置已更新:', isLargeText ? '大字版' : '标准版');
    } catch (err) {
      console.error('更新字体大小失败:', err);
    }
  },
  
  // 更新全局样式
  updateGlobalStyle(isLargeText) {
    // 在这里我们只是设置全局变量，实际样式会在app.wxss中通过条件样式实现
    // 或者在页面加载时通过动态加载不同的样式文件实现
    
    // 获取系统信息，以便在不同设备上调整字体大小
    try {
      const systemInfo = wx.getSystemInfoSync();
      const scale = isLargeText ? 1.3 : 1.0; // 大字版比例
      
      app.globalData.fontSizeScale = scale;
      app.globalData.systemInfo = systemInfo;
      
      console.log('系统信息已获取，字体比例设置为:', scale);
    } catch (err) {
      console.error('获取系统信息失败:', err);
    }
  },
  
  // 重启小程序
  restartApp() {
    wx.showModal({
      title: '重启小程序',
      content: '需要重启小程序使设置生效，是否立即重启？',
      success: function(res) {
        if (res.confirm) {
          // 退出当前页面栈，返回到首页并刷新
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});