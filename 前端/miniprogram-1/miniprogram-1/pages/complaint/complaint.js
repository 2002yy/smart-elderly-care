const app = getApp()

Page({
  data: {
    adminList: []
  },

  onLoad() {
    this.loadAdminList();
  },

  // 加载管理员列表
  loadAdminList() {
    wx.showLoading({
      title: '加载中...',
    });

    // 调用后端API获取管理员列表
    wx.request({
      url: `${app.globalData.baseUrl}/api/admins`,
      method: 'GET',
      header: {
        'Authorization': wx.getStorageSync('token')
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            adminList: res.data.data || []
          });
        } else {
          throw new Error(res.data.message || '获取管理员列表失败');
        }
      },
      fail: (err) => {
        console.error('获取管理员列表失败：', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 复制微信号
  copyWechat(e) {
    const wechat = e.currentTarget.dataset.wechat;
    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({
          title: '微信号已复制',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  // 复制手机号
  copyPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.setClipboardData({
      data: phone,
      success: () => {
        wx.showToast({
          title: '手机号已复制',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  // 点击管理员项
  onAdminTap(e) {
    const id = e.currentTarget.dataset.id;
    const admin = this.data.adminList.find(a => a.id === id);

    wx.showActionSheet({
      itemList: ['复制微信号', '拨打电话'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            // 复制微信号
            wx.setClipboardData({
              data: admin.wechat,
              success: () => {
                wx.showToast({
                  title: '微信号已复制',
                  icon: 'success'
                });
              }
            });
            break;
          case 1:
            // 拨打电话
            wx.makePhoneCall({
              phoneNumber: admin.phone,
              fail: (err) => {
                console.error('拨打电话失败：', err);
                wx.showToast({
                  title: '拨打电话失败',
                  icon: 'none'
                });
              }
            });
            break;
        }
      }
    });
  }
}); 