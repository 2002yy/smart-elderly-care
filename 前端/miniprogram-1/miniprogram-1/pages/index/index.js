Page({
  // 页面数据定义，存储页面渲染和交互所需的各种状态
  data: {
    // 用户信息对象，整合头像、用户名、用户类型等核心信息
    userInfo: {
      avatarurl: '', // 头像地址，初始为空
      username: '昵称', // 用户名默认值
      userType: '' // 用户类型默认值，0可根据业务代表特定身份（如老人）
    },
    profileActive: false, // 个人信息栏点击后的动画激活状态
    createActive: false, // 创建任务点击后的动画激活状态
    viewActive: false, // 查看任务点击后的动画激活状态
    emergencyActive: false, // 紧急呼救双击后的激活状态
    showEmergencyBtn: false, // 控制是否显示紧急呼救按钮，默认隐藏
    showServiceCreate: false, // 控制是否显示创建任务相关入口，默认隐藏
  },

  // 页面加载时触发的生命周期函数，常用于初始化数据
  onLoad: function (options) {
    // 从本地缓存中读取用户信息，若缓存不存在则返回空对象
    const cacheUserInfo = wx.getStorageSync('userInfo') || {};
    
    // 正确处理userType，确保即使是0也能被正确读取
    const userType = cacheUserInfo.userType !== undefined ? cacheUserInfo.userType : 99;
    
    // 更新页面数据中的userInfo，优先使用缓存数据，缓存没有则用默认值
    this.setData({
      userInfo: {
        avatarurl: cacheUserInfo.avatarurl || '', 
        username: cacheUserInfo.nickname || '昵称', 
        userType: userType // 使用正确处理后的userType
      }
    }, () => {
      // setData的回调函数，确保数据更新完成后，再执行依赖这些数据的初始化逻辑
      this._initUserTypeRelated();
    });
  },

  // 页面显示时触发的生命周期函数，每次页面切换到前台都会执行
  onShow: function () {
    this.checkLoginStatus();
  },

  onRefresh: function() {
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    
    // 每次页面显示时重新获取用户信息，确保数据最新
    const cacheUserInfo = wx.getStorageSync('userInfo') || {};
    const userType = cacheUserInfo.userType !== undefined ? cacheUserInfo.userType : 99;
    
    this.setData({
      'userInfo.avatarurl': cacheUserInfo.avatarurl || this.data.userInfo.avatarurl,
      'userInfo.username': cacheUserInfo.nickname || this.data.userInfo.username,
      'userInfo.userType': userType
    }, () => {
      this._initUserTypeRelated();
    });
    
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },

  // 初始化与用户类型相关的显示逻辑，根据用户类型决定某些按钮或入口是否显示
  _initUserTypeRelated() {
    // 从页面数据中解构出用户类型
    const { userType } = this.data.userInfo;
    console.log('当前用户类型:', userType); // 添加日志便于调试
    
    // 根据用户类型更新页面数据，控制对应按钮/入口的显示隐藏
    this.setData({
      showEmergencyBtn: userType === 0, // 用户类型为 0 时显示紧急呼救按钮
      showServiceCreate: [0, 1].includes(Number(userType)) // 确保类型转换正确
    });
  },

  // 个人信息栏点击事件处理函数
  onProfileTap() {
    this.setData({ profileActive: true });
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/info/info',
        fail: (err) => {
          console.error('导航到个人信息页面失败：', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        },
        complete: () => {
          setTimeout(() => {
            this.setData({ profileActive: false });
          }, 200);
        }
      });
    }, 100);
  },

  // 创建服务点击处理
  onCreateService() {
    this.setData({ createActive: true });
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/service_create/service_create',
        fail: (err) => {
          console.error('导航到创建服务页面失败：', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        },
        complete: () => {
          setTimeout(() => {
            this.setData({ createActive: false });
          }, 200);
        }
      });
    }, 100);
  },

  // 查看服务点击处理
  onViewService() {
    this.setData({ viewActive: true });
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/service_list/service_list',
        fail: (err) => {
          console.error('导航到服务列表页面失败：', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        },
        complete: () => {
          setTimeout(() => {
            this.setData({ viewActive: false });
          }, 200);
        }
      });
    }, 100);
  },

  // 紧急呼救点击处理
  onEmergencyTap() {
    this.setData({ emergencyActive: true });
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/emergency_info/emergency_info',
        fail: (err) => {
          console.error('导航到紧急呼救页面失败：', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        },
        complete: () => {
          setTimeout(() => {
            this.setData({ emergencyActive: false });
          }, 200);
        }
      });
    }, 100);
  },
});