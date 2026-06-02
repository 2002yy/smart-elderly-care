Page({
  data: {
    userInfo: null,
    tapTime: {
      profile: 0,
      binding: 0,
      emergency: 0,
      complaint: 0,
      settings: 0
    },
    userInfo: {
      avatarurl: '', // 头像地址，初始为空
      username: '昵称', // 用户名默认值
      userType: 0 // 用户类型默认值，0可根据业务代表特定身份（如老人）
    },
    showServiceRouter:false,
    showBindBtn:false,
    showComplaintBtn:false,
    showEmergencyBtn:false,
    showSettingBtn:false,
    showMessageBtn:false
  },


  // 页面加载时触发的生命周期函数，常用于初始化数据
  onLoad: function (options) {
    // 从本地缓存中读取用户信息，若缓存不存在则返回空对象
    const cacheUserInfo = wx.getStorageSync('userInfo') || {};
    // 更新页面数据中的userInfo，优先使用缓存数据，缓存没有则用默认值
    this.setData({
      userInfo: {
        avatarurl: cacheUserInfo.avatarurl || '', 
        username: cacheUserInfo.nickname || '昵称', 
        userType: cacheUserInfo.userType || 0 
      }
    });
    // 根据userType设置按钮显示状态
    this.updateShowButtons();
  },

  //设置按钮显示状态
  updateShowButtons() {
    const { userType } = this.data.userInfo;
    let showState = {
      showServiceRouter: false,
      showBindBtn: false,
      showComplaintBtn: false,
      showEmergencyBtn: false,
      showSettingBtn: false,
      showMessageBtn:false
    };

    if (userType === 0) {
      // userType为0时，所有按钮显示
      showState = {
        showServiceRouter: true,
        showBindBtn: true,
        showComplaintBtn: true,
        showEmergencyBtn: true,
        showSettingBtn: true,
        showMessageBtn:true
      };
    } else if (userType === 1) {
      // userType为1时，除emergency和settings外的按钮显示
      showState = {
        showServiceRouter: true,
        showBindBtn: true,
        showComplaintBtn: true,
        showMessageBtn:true,
        showEmergencyBtn: false,
        showSettingBtn: false
      };
    }
    // 其他情况保持默认false

    this.setData(showState);
  },

  //我的服务
  navigateToPage: function(e) {
    const url = e.currentTarget.dataset.url;
    const status = e.currentTarget.dataset.status;
    
    console.log('导航到服务页面，状态:', status);
    
    if (url === '/pages/service_list/service_list') {
      // 先将要选中的状态保存到全局数据
      getApp().globalData.selectedServiceStatus = parseInt(status);
      
      // 切换到服务列表页
      wx.switchTab({
        url: '/pages/service_list/service_list'
      });
    } else {
      wx.navigateTo({
        url: url
      });
    }
  },

  // 功能项点击处理
  onFunctionTap(e) {
    const type = e.currentTarget.dataset.type;
    const now = Date.now();
    const lastTapTime = this.data.tapTime[type];
    
    // 更新点击时间
    const tapTime = { ...this.data.tapTime };
    tapTime[type] = now;
    this.setData({ tapTime });

    // 检查是否是双击（两次点击间隔小于300ms）
    if (now - lastTapTime < 300) {
      this.handleFunction(type);
    }
  },

  // 处理功能跳转
  handleFunction(type) {
    switch (type) {
      case 'profile':
        wx.navigateTo({
          url: '/pages/signup/signup'
        });
        break;
      case 'binding':
        wx.navigateTo({
          url: '/pages/bind_list/bind_list'
        });
        break;
      case 'emergency':
        wx.navigateTo({
          url: '/pages/emergency/emergency'
        });
        break;
      case 'complaint':
        wx.navigateTo({
          url: '/pages/complaint/complaint'
        });
        break;
      case 'settings':
        wx.navigateTo({
          url: '/pages/accessibility/accessibility'
        });
        break;
      case 'message':
        wx.navigateTo({
          url: '/pages/message/message'
        });
        break;
    }
  },

  onShow: function () {
    this.loadAndSetUserInfo();
  },

  // 提供给其他页面调用的刷新方法
  onRefresh: function() {
    this.loadAndSetUserInfo();
  },

  loadAndSetUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.userType !== 99) {
      this.setData({
        userInfo: {
          avatarurl: userInfo.avatarurl || '',
          username: userInfo.nickname || '昵称',
          userType: userInfo.userType || 0
        }
      });
      this.updateShowButtons();
    }
  }
}); 