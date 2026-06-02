var app = getApp();

// 补零函数，替代padStart
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    var date = new Date(dateStr);
    // 将UTC时间转换为北京时间（UTC+8）
    var beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    var year = beijingDate.getFullYear();
    var month = padZero(beijingDate.getMonth() + 1);
    var day = padZero(beijingDate.getDate());
    var hour = padZero(beijingDate.getHours());
    var minute = padZero(beijingDate.getMinutes());
    
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  } catch (e) {
    console.error('日期格式化错误:', e);
    return dateStr;
  }
}

Page({
  data: {
    serviceId: '', // 服务ID
    serviceData: {
      id: '',
      type: '',
      scheduledTime: '',
      address: '',
      remark: '',
      status: 1, // 默认待进行
      statusText: '待进行',
      creator: '',
      createTime: '',
      staff: '',
      targetId: '',
      targetName: ''
    },
    userType: 0, // 用户类型，默认为老人
    isLoading: false, // 是否正在加载
    showUploadBtn: false, // 是否显示上传按钮
    showModifyBtn: false, // 是否显示修改按钮
    showPayBtn: false, // 是否显示支付按钮
    showEvaluateBtn: false, // 是否显示评价按钮
    statusMap: {
      1: '待进行',
      2: '进行中',
      3: '待支付',
      4: '待评价',
      5: '已完成'
    }
  },

  onLoad: function(options) {
    // 获取用户信息
    var userInfo = wx.getStorageSync('userInfo') || {};
    var userType = userInfo.userType || 0;
    
    this.setData({
      userType: userType
    });
    
    console.log('服务详情页面加载，接收到的参数:', options);
    
    if (options.id) {
      this.setData({ serviceId: options.id });
      console.log('正在加载服务详情，ID:', options.id);
      this.loadServiceData(options.id);
    } else {
      wx.showToast({
        title: '服务ID不存在',
        icon: 'none'
      });
      setTimeout(function() {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 加载服务数据
  loadServiceData: function(serviceId) {
    var cachedServices = wx.getStorageSync('serviceInfo') || [];
    var service = null;
    
    // 从缓存中查找服务
    for (var i = 0; i < cachedServices.length; i++) {
      // 检查id或serviceId是否匹配
      if (cachedServices[i].id === serviceId || cachedServices[i].serviceId === serviceId) {
        service = cachedServices[i];
        break;
      }
    }
    
    if (service) {
      // 格式化时间
      var formattedCreateTime = service.createTime ? formatDate(service.createTime) : '';
      var formattedScheduledTime = service.scheduledTime ? formatDate(service.scheduledTime) : '';
      
      // 获取服务类型文本
      var typeText = '';
      switch(parseInt(service.type)) {
        case 0: typeText = '生活照料'; break;
        case 1: typeText = '医疗护理'; break;
        case 2: typeText = '心理护理'; break;
        default: typeText = '未知类型';
      }
      
      // 设置服务数据
      this.setData({
        serviceData: {
          id: service.id || service.serviceId || '',
          type: service.type || service.serviceType || '',
          typeText: typeText,
          scheduledTime: formattedScheduledTime,
          address: service.address || service.appointedAddress || '',
          remark: service.remark || service.serviceDes || '',
          status: service.status !== undefined ? service.status : (service.serviceStatus || 1),
          statusText: this.data.statusMap[service.status !== undefined ? service.status : service.serviceStatus] || '待进行',
          creator: service.creator || service.creatorName || '未知',
          createTime: formattedCreateTime,
          staff: service.staffName || service.providerName || '未分配',
          targetId: service.targetId || '',
          targetName: service.targetName || '未知'
        }
      });
      
      // 根据用户类型和服务状态决定显示哪些按钮
      this.updateButtonDisplay();
    } else {
      // 未找到服务，尝试从服务器获取
      this.fetchServiceFromServer(serviceId);
    }
  },
  
  // 从服务器获取服务数据
  fetchServiceFromServer: function(serviceId) {
    var that = this;
    var token = wx.getStorageSync('token');
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '加载中...'
    });
    
    console.log('正在从服务器获取服务详情，ID:', serviceId);
    
    wx.request({
      url: app.globalData.baseUrl + '/api/services/' + serviceId,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: function(res) {
        wx.hideLoading();
        
        console.log('服务详情API响应:', res.data);
        
        if (res.statusCode === 200) {
          var service = res.data.service || res.data;
          if (service) {
            // 格式化时间
            var formattedCreateTime = service.createTime ? formatDate(service.createTime) : '';
            var formattedScheduledTime = service.scheduledTime ? formatDate(service.scheduledTime) : '';
            
            // 获取服务类型文本
            var typeText = '';
            var serviceType = service.serviceType !== undefined ? service.serviceType : service.type;
            switch(parseInt(serviceType)) {
              case 0: typeText = '生活照料'; break;
              case 1: typeText = '医疗护理'; break;
              case 2: typeText = '心理护理'; break;
              default: typeText = '未知类型';
            }
            
            // 设置服务数据
            that.setData({
              serviceData: {
                id: service.serviceId || service.id || '',
                type: serviceType || '',
                typeText: typeText,
                scheduledTime: formattedScheduledTime,
                address: service.appointedAddress || service.address || '',
                remark: service.serviceDes || service.remark || '',
                status: service.serviceStatus !== undefined ? service.serviceStatus : (service.status || 1),
                statusText: that.data.statusMap[service.serviceStatus !== undefined ? service.serviceStatus : service.status] || '待进行',
                creator: service.creatorName || service.creator || '未知',
                createTime: formattedCreateTime,
                staff: service.providerName || service.staffName || '未分配',
                targetId: service.targetId || '',
                targetName: service.targetName || '未知'
              }
            });
            
            // 更新本地缓存
            that.updateServiceCache(service);
            
            // 根据用户类型和服务状态决定显示哪些按钮
            that.updateButtonDisplay();
          } else {
            console.error('服务详情API返回了成功状态码，但没有服务数据');
            wx.showToast({
              title: '服务不存在',
              icon: 'none'
            });
          }
        } else {
          console.error('服务详情API返回了错误状态码:', res.statusCode);
          wx.showToast({
            title: res.data.message || '获取服务详情失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('获取服务详情失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 更新本地服务缓存
  updateServiceCache: function(service) {
    var cachedServices = wx.getStorageSync('serviceInfo') || [];
    var found = false;
    
    // 将后端字段名映射到前端字段名
    var mappedService = {
      id: service.serviceId || service.id,
      status: service.serviceStatus !== undefined ? service.serviceStatus : service.status,
      type: service.serviceType !== undefined ? service.serviceType : service.type,
      scheduledTime: service.scheduledTime || '',
      address: service.appointedAddress || service.address,
      remark: service.serviceDes || service.remark,
      targetId: service.targetId,
      targetName: service.targetName,
      providerId: service.providerId,
      providerName: service.providerName,
      staffName: service.providerName, // 用于前端显示
      clientName: service.targetName // 用于前端显示
    };
    
    // 检查是否存在该服务
    for (var i = 0; i < cachedServices.length; i++) {
      if (cachedServices[i].id === mappedService.id) {
        // 更新现有服务
        cachedServices[i] = mappedService;
        found = true;
        break;
      }
    }
    
    // 不存在则添加新服务
    if (!found) {
      cachedServices.push(mappedService);
    }
    
    // 更新缓存
    wx.setStorageSync('serviceInfo', cachedServices);
  },
  
  // 根据用户类型和服务状态更新按钮显示
  updateButtonDisplay: function() {
    var userType = this.data.userType;
    var status = this.data.serviceData.status;
    
    console.log('更新按钮显示，用户类型:', userType, '服务状态:', status);
    
    var showModifyBtn = false;
    var showPayBtn = false;
    var showEvaluateBtn = false;
    var showUploadBtn = false;
    
    // 客户用户（老人或监护人）
    if (userType === 0 || userType === 1) {
      if (status === 0 || status === 1) {
        showModifyBtn = true; // 未指派或待进行状态可以修改
      } else if (status === 3) {
        showPayBtn = true; // 待支付状态显示支付按钮
      } else if (status === 4) {
        showEvaluateBtn = true; // 待评价状态显示评价按钮
      }
    } 
    // 服务人员
    else if (userType === 2 || userType === 3 || userType === 4) {
      if (status === 3 || status === 4) {
        showUploadBtn = true; // 服务人员在待支付或待评价状态可以上传服务记录
      }
    }
    
    this.setData({
      showModifyBtn: showModifyBtn,
      showPayBtn: showPayBtn,
      showEvaluateBtn: showEvaluateBtn,
      showUploadBtn: showUploadBtn
    });
  },
  
  // 修改服务
  onModifyService: function() {
    var serviceId = this.data.serviceId;
    console.log('跳转到修改服务页面，ID:', serviceId);
    
    // 直接从服务器获取最新的服务数据
    var token = wx.getStorageSync('token');
    var that = this;
    
    wx.showLoading({
      title: '加载中...'
    });
    
    wx.request({
      url: app.globalData.baseUrl + '/api/services/' + serviceId,
      method: 'GET',
      header: {
        'Authorization': token
      },
      success: function(res) {
        wx.hideLoading();
        
        if (res.statusCode === 200) {
          console.log('从服务器获取的服务详情:', res.data);
          
          // 将服务数据添加到缓存
          var cachedServices = wx.getStorageSync('serviceInfo') || [];
          var service = res.data;
          var found = false;
          
          // 检查是否已存在于缓存中
          for (var i = 0; i < cachedServices.length; i++) {
            if ((cachedServices[i].id === serviceId) || 
                (cachedServices[i].serviceId === serviceId) || 
                (cachedServices[i].serviceId === parseInt(serviceId))) {
              // 更新现有服务
              cachedServices[i] = service;
              found = true;
              break;
            }
          }
          
          // 不存在则添加
          if (!found) {
            cachedServices.push(service);
          }
          
          // 更新缓存
          wx.setStorageSync('serviceInfo', cachedServices);
          
          // 跳转到修改页面
          wx.navigateTo({
            url: '/pages/service_create/service_create?id=' + serviceId
          });
        } else {
          wx.showToast({
            title: res.data.message || '获取服务详情失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('获取服务详情失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 支付
  onPayment: function() {
    var that = this;
    var serviceId = this.data.serviceId;
    
    console.log('开始支付流程，服务ID:', serviceId);
    
    this.setData({
      isLoading: true
    });
    
    // 模拟支付过程
    wx.showLoading({
      title: '处理支付...'
    });
    
    // 延迟2秒模拟支付过程
    setTimeout(function() {
      console.log('支付完成，准备更新服务状态为待评价(4)');
      // 更新服务状态为待评价(4)
      that.updateServiceStatusToServer(serviceId, 4);
    }, 2000);
  },
  
  // 向服务器更新服务状态
  updateServiceStatusToServer: function(serviceId, newStatus) {
    var token = wx.getStorageSync('token');
    var that = this;
    
    console.log('向服务器更新服务状态，ID:', serviceId, '新状态:', newStatus);
    
    // 获取当前服务数据，确保所有必须字段都包含
    var service = this.data.serviceData;
    
    // 构建与后端对应的请求数据
    var requestData = {
      serviceStatus: newStatus
    };
    
    // 获取与后端字段名匹配的数据
    if (service.type !== undefined) {
      requestData.serviceType = service.type;
    }
    
    if (service.address) {
      requestData.appointedAddress = service.address;
    }
    
    if (service.remark) {
      requestData.serviceDes = service.remark;
    }
    
    if (service.targetId) {
      requestData.targetId = service.targetId;
    }
    
    console.log('发送到服务器的数据:', requestData);
    
    wx.request({
      url: `${app.globalData.baseUrl}/api/services/update/${serviceId}`,
      method: 'POST',
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: function(res) {
        wx.hideLoading();
        console.log('服务状态更新响应:', res);
        
        if (res.statusCode === 200 && res.data) {
          console.log('服务状态更新成功:', res.data);
          
          // 服务器返回的更新后的服务数据
          var updatedService = res.data.service || res.data;
          console.log('更新后的服务数据:', updatedService);
          
          // 完全清除缓存，让服务列表页面重新获取
          wx.removeStorageSync('serviceInfo');
          
          // 更新当前页面显示
          that.setData({
            'serviceData.status': newStatus,
            'serviceData.statusText': that.data.statusMap[newStatus] || '未知状态',
            isLoading: false
          });
          
          // 更新按钮显示
          that.updateButtonDisplay();
          
          wx.showToast({
            title: '支付成功',
            icon: 'success'
          });
          
          // 延迟返回到服务列表页面
          setTimeout(function() {
            console.log('准备跳转到服务列表页面');
            wx.switchTab({
              url: '/pages/service_list/service_list'
            });
          }, 1500);
        } else {
          that.setData({ isLoading: false });
          console.error('服务状态更新失败:', res);
          wx.showToast({
            title: res.data && res.data.message ? res.data.message : '更新服务状态失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        that.setData({ isLoading: false });
        wx.hideLoading();
        console.error('更新服务状态失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 评价服务
  onEvaluateService: function() {
    var serviceId = this.data.serviceId;
    console.log('跳转到评价服务页面，ID:', serviceId);
    
    try {
      // 确保服务ID不为空
      if (!serviceId) {
        wx.showToast({
          title: '服务ID不存在',
          icon: 'none'
        });
        return;
      }
      
      // 再次确认服务数据存在
      if (!this.data.serviceData) {
        wx.showToast({
          title: '服务数据不存在',
          icon: 'none'
        });
        return;
      }
      
      // 将服务信息保存到缓存，确保评价页面能获取到
      var cachedServices = wx.getStorageSync('serviceInfo') || [];
      var found = false;
      for (var i = 0; i < cachedServices.length; i++) {
        if (cachedServices[i].id === serviceId || 
            cachedServices[i].serviceId === serviceId || 
            cachedServices[i].id === parseInt(serviceId) || 
            cachedServices[i].serviceId === parseInt(serviceId)) {
          found = true;
          // 确保服务状态正确
          cachedServices[i].status = 4;
          cachedServices[i].serviceStatus = 4;
          break;
        }
      }
      
      if (!found) {
        // 如果缓存中没有找到该服务，则添加
        var serviceData = this.data.serviceData;
        serviceData.id = serviceId;
        serviceData.serviceId = serviceId;
        serviceData.status = 4;
        serviceData.serviceStatus = 4;
        cachedServices.push(serviceData);
      }
      
      // 更新缓存
      wx.setStorageSync('serviceInfo', cachedServices);
      
      console.log('准备跳转到评价页面，服务ID:', serviceId);
      
      // 跳转到评价页面，使用serviceId作为参数
      wx.navigateTo({
        url: '/pages/service_evaluate/service_evaluate?id=' + serviceId,
        success: function() {
          console.log('成功跳转到评价页面');
        },
        fail: function(err) {
          console.error('跳转到评价页面失败:', err);
          wx.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('评价服务过程中出错:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },
  
  // 上传服务记录
  onUploadRecord: function() {
    var that = this;
    
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function(res) {
        var tempFilePath = res.tempFiles[0].path;
        var fileName = res.tempFiles[0].name;
        
        that.setData({
          isLoading: true
        });
        
        wx.showLoading({
          title: '上传中...'
        });
        
        // 模拟上传过程，3秒后完成
        setTimeout(function() {
          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
          
          that.setData({
            isLoading: false
          });
        }, 3000);
      },
      fail: function(err) {
        console.error('选择文件失败:', err);
      }
    });
  },
  
  // 更新服务状态
  updateServiceStatus: function(newStatus) {
    var that = this;
    var cachedServices = wx.getStorageSync('serviceInfo') || [];
    var serviceId = this.data.serviceId;
    
    // 更新缓存中的服务状态
    for (var i = 0; i < cachedServices.length; i++) {
      if (cachedServices[i].id === serviceId || cachedServices[i].serviceId === serviceId) {
        cachedServices[i].status = newStatus;
        break;
      }
    }
    
    // 更新缓存
    wx.setStorageSync('serviceInfo', cachedServices);
    
    // 更新页面显示
    this.setData({
      'serviceData.status': newStatus,
      'serviceData.statusText': this.data.statusMap[newStatus] || '未知状态'
    });
    
    // 更新按钮显示
    this.updateButtonDisplay();
    
    // 可以在这里添加向服务器更新状态的请求
    // 这里省略实现
  },

  // 取消服务
  onCancelService: function() {
    var that = this;
    wx.showModal({
      title: '确认取消',
      content: '您确定要取消这个服务吗？此操作无法撤销。',
      confirmColor: '#e64340',
      success: function(res) {
        if (res.confirm) {
          that.cancelServiceRequest();
        }
      }
    });
  },

  cancelServiceRequest: function() {
    var serviceId = this.data.serviceId;
    var token = wx.getStorageSync('token');

    console.log('正在取消服务，ID:', serviceId);
    wx.showLoading({ title: '取消中...' });

    wx.request({
      url: `${app.globalData.baseUrl}/api/services/cancel/${serviceId}`,
      method: 'POST',
      header: {
        'Authorization': token
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 从缓存中删除该服务
          var cachedServices = wx.getStorageSync('serviceInfo') || [];
          var updatedServices = cachedServices.filter(s => 
            s.id !== serviceId && s.serviceId !== serviceId
          );
          wx.setStorageSync('serviceInfo', updatedServices);
          
          wx.showToast({ title: '服务已取消', icon: 'success' });
          
          // 延迟返回
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.message || '取消服务失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('取消服务请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
}); 