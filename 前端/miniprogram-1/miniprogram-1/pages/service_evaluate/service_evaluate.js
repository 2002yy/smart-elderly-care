const app = getApp();
const { formatBeijingTime } = require('../../utils/serviceTime.js');

Page({
  data: {
    serviceId: '', // 服务ID
    serviceData: null, // 服务数据
    rating: 0, // 评分（1-5）
    ratingText: '请点击星星评分', // 评分文字说明
    comment: '', // 评价内容
    isSubmitting: false, // 是否正在提交
    submitActive: false // 添加按钮触摸效果
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ serviceId: options.id });
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
    }
  },

  onShow() {
    if (this.data.serviceId) this.fetchServiceFromServer(this.data.serviceId);
  },
  
  // 评价页不信任任何持久缓存；每次展示均重新核对订单状态和当前用户。
  fetchServiceFromServer(serviceId) {
    this.setData({ serviceData: null });
    const token = wx.getStorageSync('token');
    const requestVersion = (this._detailRequestVersion || 0) + 1;
    this._detailRequestVersion = requestVersion;
    
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: `${app.globalData.baseUrl}/api/services/${serviceId}`,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (requestVersion !== this._detailRequestVersion || token !== wx.getStorageSync('token')) return;
        wx.hideLoading();
        
        if (res.statusCode === 200 && res.data) {
          const service = res.data;
          const status = service.serviceStatus !== undefined ? service.serviceStatus : service.status;
          const currentUser = wx.getStorageSync('userInfo') || {};
          if (status !== 4 || String(service.targetId) !== String(currentUser.id)) {
            wx.showToast({ title: '当前订单不可评价', icon: 'none' });
            setTimeout(() => wx.navigateBack(), 1500);
            return;
          }
          this.setData({ serviceData: {
            id: service.serviceId || service.id || serviceId,
            status,
            type: service.serviceType !== undefined ? service.serviceType : service.type,
            scheduledTime: formatBeijingTime(service.scheduledTime, true) || '未设置',
            address: service.appointedAddress || service.address || '未设置',
            remark: service.serviceDes || service.remark || '',
            targetName: service.targetName || '未知',
            staffName: service.providerName || service.staffName || '未知',
            clientName: service.targetName || '未知'
          } });
        } else {
          wx.showToast({ 
            title: res.data && res.data.message ? res.data.message : '获取服务数据失败', 
            icon: 'none' 
          });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      },
      fail: (err) => {
        if (requestVersion !== this._detailRequestVersion || token !== wx.getStorageSync('token')) return;
        wx.hideLoading();
        console.error('获取服务数据失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    });
  },

  // 点击星星评分
  onStarTap(e) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    let ratingText = '';
    
    switch (rating) {
      case 1:
        ratingText = '非常不满意';
        break;
      case 2:
        ratingText = '不满意';
        break;
      case 3:
        ratingText = '一般';
        break;
      case 4:
        ratingText = '满意';
        break;
      case 5:
        ratingText = '非常满意';
        break;
    }

    this.setData({
      rating,
      ratingText
    });
  },

  // 评价内容输入
  onContentInput(e) {
    this.setData({
      comment: e.detail.value
    });
  },

  // 表单提交
  onSubmit() {
    if (this.data.isSubmitting || !this.data.serviceData) return;

    const { rating, comment, serviceId } = this.data;
    
    if (rating === 0) {
      wx.showToast({ title: '请选择服务评分', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    const token = wx.getStorageSync('token');
    
    // 构建评价请求数据
    const requestData = {
      serviceEvaluationStars: rating // 状态由服务端决定
    };
    
    // 仅当评论不为空时添加评价备注字段
    if (comment && comment.trim() !== '') {
      requestData.serviceEvaluationNotes = comment; // 使用正确的字段名
    }
    
    wx.request({
      url: `${app.globalData.baseUrl}/api/services/evaluate/${serviceId}`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: '评价成功', icon: 'success' });
          
          // 延迟返回
          setTimeout(() => {
            // 返回到服务列表页
            wx.switchTab({
              url: '/pages/service_list/service_list',
              success: function() {
                // 获取当前页面栈
                const pages = getCurrentPages();
                // 找到服务列表页面
                const listPage = pages.find(p => p.route === 'pages/service_list/service_list');
                // 如果找到了服务列表页面并且它有onRefresh方法
                if (listPage && typeof listPage.onRefresh === 'function') {
                  // 调用服务列表页面的onRefresh方法
                  listPage.onRefresh();
                }
              }
            });
          }, 1500);
        } else {
          console.error('评价提交失败:', res);
          let errorMsg = '评价失败';
          
          if (res.data && res.data.message) {
            errorMsg = res.data.message;
          } else if (res.statusCode === 500) {
            errorMsg = '服务器内部错误，请稍后重试';
          }
          
          wx.showToast({ 
            title: errorMsg, 
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('评价请求网络错误:', err);
        wx.showToast({ 
          title: '网络请求失败，请检查网络连接', 
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        this.setData({ isSubmitting: false });
        wx.hideLoading();
      }
    });
  },
  
  // 添加按钮触摸效果
  onSubmitTouchStart() {
    this.setData({ submitActive: true });
  },
  
  onSubmitTouchEnd() {
    this.setData({ submitActive: false });
  }
});
