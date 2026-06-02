const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoading: true,
    bindInfo: [], // 所有绑定数据
    pendingBinds: [], // 待确认的绑定 (bind_status = 0)
    activeBinds: [], // 已绑定的对象 (bind_status = 1)
    // 不显示拒绝/解除的绑定 (bind_status = 2)
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.fetchBindInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.fetchBindInfo();
  },

  /**
   * 从服务器获取绑定信息
   */
  fetchBindInfo() {
    this.setData({ isLoading: true });

    // 获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 2000);
      
      return;
    }

    // 请求后端API获取绑定信息
    wx.request({
      url: `${app.globalData.baseUrl}/api/bindings`,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 更新本地缓存
          const bindInfo = res.data.data || [];
          wx.setStorageSync('bindInfo', bindInfo);
          // 处理数据并分类
          this.processBindInfo(bindInfo);
        } else {
          this.handleRequestError(res.data.message || '获取绑定信息失败');
        }
      },
      fail: (err) => {
        this.handleRequestError('网络请求失败，请检查网络连接');
        console.error('获取绑定信息失败:', err);
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 处理绑定信息并按状态分类
   */
  processBindInfo(bindInfo) {
    // 按状态分类
    const pendingBinds = bindInfo.filter(item => item.bind_status === 0);
    const activeBinds = bindInfo.filter(item => item.bind_status === 1);
    // 状态为2的不显示

    this.setData({
      bindInfo,
      pendingBinds,
      activeBinds
    });
  },

  /**
   * 处理请求错误
   */
  handleRequestError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 点击待确认的绑定项
   */
  onPendingBindTap(e) {
    const item = e.currentTarget.dataset.item;
    
    if (item.is_actionable) {
      // is_actionable为true，表示当前用户是接收方，可以操作
      wx.showActionSheet({
        itemList: ['接受绑定', '拒绝绑定'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 接受绑定
            this.updateBindStatus(item.id, 1, item.name);
          } else if (res.tapIndex === 1) {
            // 拒绝绑定
            this.updateBindStatus(item.id, 2, item.name);
          }
        }
      });
    } else {
      // is_actionable为false，表示当前用户是发起方，只能等待
      wx.showToast({
        title: '等待对方确认',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 点击已绑定的项
   */
  onActiveBindTap(e) {
    const item = e.currentTarget.dataset.item;
    
    wx.showModal({
      title: '解除绑定',
      content: `确定要解除与 ${item.name} 的绑定关系吗？`,
      confirmText: '解除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.updateBindStatus(item.id, 2, item.name);
        }
      }
    });
  },

  /**
   * 更新绑定状态
   */
  updateBindStatus(id, status, name) {
    const token = wx.getStorageSync('token');
    const statusText = status === 1 ? '接受' : '拒绝/解除';
    
    wx.showLoading({
      title: `正在${statusText}绑定...`
    });

    wx.request({
      url: `${app.globalData.baseUrl}/api/bindings/${id}/status`,
      method: 'PUT',
      data: {
        bind_status: status
      },
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: status === 1 ? '已接受绑定' : '已解除绑定',
            icon: 'success',
            duration: 2000
          });
          
          // 刷新数据
          this.fetchBindInfo();
        } else {
          this.handleRequestError(res.data.message || `${statusText}绑定失败`);
        }
      },
      fail: (err) => {
        this.handleRequestError('网络请求失败，请检查网络连接');
        console.error(`${statusText}绑定失败:`, err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});
