// pages/emergency_info/emergency_info.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    bindInfo: [],
    emergencyContact: {},
    emergencyInfo: {},
    loading: false,
    sendingHelp: false,
    location: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAllInfo();
    this.fetchEmergencyInfo();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载数据，确保数据最新
    this.loadAllInfo();
    this.fetchEmergencyInfo();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.fetchEmergencyInfo();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 从缓存加载所有信息
   */
  loadAllInfo() {
    // 加载用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 加载绑定信息
    const bindInfo = wx.getStorageSync('bindInfo') || [];
    
    // 找到已激活的绑定对象作为紧急联系人
    const activeBind = bindInfo.find(bind => bind.bind_status === 1);
    
    // 加载紧急医疗信息
    const emergencyInfo = wx.getStorageSync('emergencyInfo') || {};

    // 更新数据
    this.setData({
      userInfo,
      bindInfo,
      emergencyContact: activeBind || {},
      emergencyInfo
    });

    // 检查是否有紧急医疗信息
    if (!emergencyInfo.bloodType && 
        !emergencyInfo.allergies && 
        !emergencyInfo.basicDiseases && 
        !emergencyInfo.surgeryHistory && 
        !emergencyInfo.medication && 
        !emergencyInfo.emergencyNotes) {
      // 如果没有紧急医疗信息，提示用户填写
      wx.showToast({
        title: '请完善急救信息',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 从后端获取紧急医疗信息
   */
  fetchEmergencyInfo() {
    this.setData({ loading: true });
    
    // 获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      this.setData({ loading: false });
      return;
    }
    
    // 获取全局配置中的baseUrl
    const app = getApp();
    const baseUrl = app.globalData.baseUrl || 'http://localhost:8081';
    
    wx.request({
      url: `${baseUrl}/api/emergency/info`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.emergencyInfo) {
          // 从后端获取数据成功
          const emergencyInfo = res.data.emergencyInfo;
          
          // 保存到本地缓存
          wx.setStorageSync('emergencyInfo', emergencyInfo);
          
          this.setData({
            emergencyInfo
          });
        } else {
          console.error('获取紧急医疗信息失败:', res);
        }
      },
      fail: (err) => {
        console.error('请求紧急医疗信息失败:', err);
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 发送紧急求助
   */
  sendEmergencyHelp() {
    if (this.data.sendingHelp) {
      return; // 防止重复点击
    }

    this.setData({ sendingHelp: true });
    
    // 获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      this.setData({ sendingHelp: false });
      return;
    }

    // 获取位置信息
    wx.showLoading({
      title: '获取位置信息...'
    });

    wx.getLocation({
      type: 'gcj02', // 使用国测局坐标系
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        
        this.setData({ location });
        this.submitEmergencyHelp(location);
      },
      fail: (err) => {
        console.error('获取位置信息失败:', err);
        wx.showModal({
          title: '位置获取失败',
          content: '无法获取您的位置信息，是否继续发送紧急求助？',
          success: (res) => {
            if (res.confirm) {
              // 用户确认，继续发送求助但不包含位置信息
              this.submitEmergencyHelp(null);
            } else {
              // 用户取消
              this.setData({ sendingHelp: false });
              wx.hideLoading();
            }
          }
        });
      }
    });
  },

  /**
   * 提交紧急求助到后端
   */
  submitEmergencyHelp(location) {
    // 获取全局配置中的baseUrl
    const app = getApp();
    const baseUrl = app.globalData.baseUrl || 'http://localhost:8081';
    
    // 获取token
    const token = wx.getStorageSync('token');
    
    wx.showLoading({
      title: '发送求助信息...'
    });
    
    const data = {
      location: location,
      message: '紧急求助'
    };
    
    wx.request({
      url: `${baseUrl}/api/emergency/help`,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: data,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showModal({
            title: '紧急求助已发送',
            content: '您的紧急求助信息已成功发送，请保持手机畅通',
            showCancel: false
          });
        } else {
          wx.showToast({
            title: res.data && res.data.message ? res.data.message : '发送求助失败',
            icon: 'none'
          });
          console.error('发送紧急求助失败:', res);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        console.error('请求失败:', err);
      },
      complete: () => {
        this.setData({ sendingHelp: false });
        wx.hideLoading();
      }
    });
  }
})