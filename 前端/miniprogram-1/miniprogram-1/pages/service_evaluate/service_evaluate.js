const app = getApp();

// 补零函数，替代padStart
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

// 将UTC时间转换为北京时间（UTC+8）并格式化
function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const year = beijingDate.getFullYear();
    const month = padZero(beijingDate.getMonth() + 1);
    const day = padZero(beijingDate.getDate());
    const hour = padZero(beijingDate.getHours());
    const minute = padZero(beijingDate.getMinutes());
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch (e) {
    console.error('日期格式化错误:', e);
    return dateStr;
  }
}

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
      this.loadServiceData();
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
    }
  },

  // 加载服务数据
  loadServiceData() {
    try {
      console.log('加载服务数据，服务ID:', this.data.serviceId);
      
      // 将serviceId转换为多种可能的格式进行查找
      const serviceId = this.data.serviceId;
      const serviceIdInt = parseInt(serviceId);
      
      const cachedServices = wx.getStorageSync('serviceInfo') || [];
      console.log('缓存中的服务数据:', cachedServices);
      
      // 使用多种格式匹配查找服务
      const service = cachedServices.find(s => 
        s.id === serviceId || 
        s.serviceId === serviceId || 
        s.id === serviceIdInt || 
        s.serviceId === serviceIdInt
      );
      
      console.log('找到的服务数据:', service);

      if (service) {
        // 处理服务数据，确保字段名一致
        const processedService = {
          id: service.serviceId || service.id || serviceId,
          status: service.serviceStatus !== undefined ? service.serviceStatus : (service.status || 4),
          type: service.serviceType !== undefined ? service.serviceType : (service.type || 0),
          scheduledTime: formatTime(service.scheduledTime) || '未设置',
          address: service.appointedAddress || service.address || '未设置',
          remark: service.serviceDes || service.remark || '',
          targetId: service.targetId || '',
          targetName: service.targetName || '未知',
          providerId: service.providerId || '',
          providerName: service.providerName || '未知',
          staffName: service.providerName || service.staffName || '未知', // 用于前端显示
          clientName: service.targetName || '未知' // 用于前端显示
        };
        
        console.log('处理后的服务数据:', processedService);
        
        this.setData({ serviceData: processedService });
      } else {
        // 如果缓存没有，尝试从服务器获取
        this.fetchServiceFromServer(serviceId);
      }
    } catch (error) {
      console.error('加载服务数据出错:', error);
      wx.showToast({ 
        title: '加载服务数据失败', 
        icon: 'none' 
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },
  
  // 从服务器获取服务数据
  fetchServiceFromServer(serviceId) {
    console.log('从服务器获取服务数据，ID:', serviceId);
    const token = wx.getStorageSync('token');
    
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
        wx.hideLoading();
        
        if (res.statusCode === 200 && res.data) {
          console.log('服务器返回的服务数据:', res.data);
          
          const service = res.data;
          
          // 处理服务数据
          const processedService = {
            id: service.serviceId || service.id || serviceId,
            status: service.serviceStatus !== undefined ? service.serviceStatus : (service.status || 4),
            type: service.serviceType !== undefined ? service.serviceType : (service.type || 0),
            scheduledTime: formatTime(service.scheduledTime) || '未设置',
            address: service.appointedAddress || service.address || '未设置',
            remark: service.serviceDes || service.remark || '',
            targetId: service.targetId || '',
            targetName: service.targetName || '未知',
            providerId: service.providerId || '',
            providerName: service.providerName || '未知',
            staffName: service.providerName || service.staffName || '未知',
            clientName: service.targetName || '未知'
          };
          
          // 更新本地数据
          this.setData({ serviceData: processedService });
          
          // 更新缓存
          const cachedServices = wx.getStorageSync('serviceInfo') || [];
          cachedServices.push(processedService);
          wx.setStorageSync('serviceInfo', cachedServices);
        } else {
          wx.showToast({ 
            title: res.data && res.data.message ? res.data.message : '获取服务数据失败', 
            icon: 'none' 
          });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      },
      fail: (err) => {
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
    if (this.data.isSubmitting) return;

    const { rating, comment, serviceId } = this.data;
    
    if (rating === 0) {
      wx.showToast({ title: '请选择服务评分', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    const token = wx.getStorageSync('token');
    
    console.log('准备提交评价：', {
      serviceId: serviceId,
      rating: rating,
      comment: comment
    });

    // 构建评价请求数据
    const requestData = {
      serviceEvaluationStars: rating, // 使用正确的字段名
      status: 5 // 将服务状态设置为5（存档）
    };
    
    // 仅当评论不为空时添加评价备注字段
    if (comment && comment.trim() !== '') {
      requestData.serviceEvaluationNotes = comment; // 使用正确的字段名
    }
    
    console.log('发送评价请求数据:', requestData);

    wx.request({
      url: `${app.globalData.baseUrl}/api/services/evaluate/${serviceId}`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: (res) => {
        console.log('评价请求响应:', res);
        console.log('评价请求响应数据:', res.data);
        
        if (res.statusCode === 200) {
          wx.showToast({ title: '评价成功', icon: 'success' });
          
          // 清除缓存，确保下次刷新获取最新数据
          wx.removeStorageSync('serviceInfo');
          
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