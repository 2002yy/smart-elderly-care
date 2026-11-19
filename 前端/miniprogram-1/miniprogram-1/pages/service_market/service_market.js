const app = getApp();

Page({
  data: {
    services: [],
    loading: false,
    applyingId: null,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onShow() {
    this.loadServices(1);
  },

  onPullDownRefresh() {
    this.loadServices(1);
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadServices(this.data.page + 1);
    }
  },

  loadServices(page) {
    const token = wx.getStorageSync('token');
    const version = (this._requestVersion || 0) + 1;
    this._requestVersion = version;
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.stopPullDownRefresh();
      return;
    }
    this.setData({ loading: true });
    wx.request({
      url: app.globalData.baseUrl + '/api/services/available',
      method: 'GET',
      data: { page, pageSize: this.data.pageSize },
      header: { Authorization: token },
      success: res => {
        if (version !== this._requestVersion) return;
        if (res.statusCode !== 200 || !res.data || !Array.isArray(res.data.data)) {
          wx.showToast({ title: '获取申请列表失败', icon: 'none' });
          return;
        }
        // 只使用服务类型和日期，不尝试获取地址、姓名或老人标识。
        const incoming = res.data.data.map(item => ({
          serviceId: item.serviceId,
          typeText: ['生活照料', '医疗护理', '心理护理'][item.type] || '其他服务',
          timeText: item.scheduledTime ? item.scheduledTime.replace('T', ' ').slice(0, 16) + ' (UTC)' : '时间待定'
        }));
        this.setData({
          services: page === 1 ? incoming : this.data.services.concat(incoming),
          page,
          hasMore: page * this.data.pageSize < res.data.total
        });
      },
      fail: () => {
        if (version === this._requestVersion) wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
      complete: () => {
        if (version === this._requestVersion) this.setData({ loading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  applyForService(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (this.data.applyingId !== null) return;
    wx.showModal({
      title: '申请接单（演示）',
      content: '服务人员身份为自行登记，平台尚未核验资质。申请不代表接单成功，需老人或监护人批准后才能查看详情。',
      success: res => {
        if (!res.confirm) return;
        this.setData({ applyingId: id });
        wx.request({
          url: app.globalData.baseUrl + '/api/services/' + id + '/apply',
          method: 'POST',
          header: { Authorization: wx.getStorageSync('token') },
          success: response => {
            if (response.statusCode === 201) {
              wx.showToast({ title: '已申请，等待批准', icon: 'none' });
            } else {
              wx.showToast({ title: '申请失败或订单已分配', icon: 'none' });
            }
          },
          fail: () => wx.showToast({ title: '网络请求失败', icon: 'none' }),
          complete: () => this.setData({ applyingId: null })
        });
      }
    });
  }
});
