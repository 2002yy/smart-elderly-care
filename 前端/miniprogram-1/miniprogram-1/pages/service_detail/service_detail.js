var app = getApp();
const { formatBeijingTime } = require('../../utils/serviceTime.js');

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
    showApplicantsBtn: false,
    showStartBtn: false,
    showRequestCompletionBtn: false,
    showConfirmCompletionBtn: false,
    awaitingCustomerConfirmation: false,
    applications: [],
    applicationsLoaded: false,
    approvingApplication: false,
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
      // 履约与隐私状态必须以服务端为准，不能优先使用可能过时的本地缓存。
      this.fetchServiceFromServer(options.id);
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

  onShow: function() {
    // 从编辑页返回或切换账户后必须重新校验访问权限与履约状态。
    if (this._hasShown && this.data.serviceId) {
      var userInfo = wx.getStorageSync('userInfo') || {};
      this.setData({
        userType: userInfo.userType,
        serviceData: {},
        applications: [],
        applicationsLoaded: false
      });
      this.updateButtonDisplay();
      this.fetchServiceFromServer(this.data.serviceId);
    }
    this._hasShown = true;
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
        
        
        if (res.statusCode === 200) {
          var service = res.data.service || res.data;
          if (service) {
            // 格式化时间
            var formattedCreateTime = service.createTime ? formatBeijingTime(service.createTime, true) + '（北京时间）' : '';
            var formattedScheduledTime = service.scheduledTime ? formatBeijingTime(service.scheduledTime, true) + '（北京时间）' : '';
            
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
                targetName: service.targetName || '未知',
                serviceStartedAt: service.serviceStartedAt || null,
                completionRequestedAt: service.completionRequestedAt || null,
                completionConfirmedAt: service.completionConfirmedAt || null
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
          that.setData({ serviceData: {}, applications: [], applicationsLoaded: false });
          that.updateButtonDisplay();
          wx.showToast({
            title: (res.data && res.data.message) || '无权访问或服务已取消',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        wx.hideLoading();
        that.setData({ serviceData: {}, applications: [], applicationsLoaded: false });
        that.updateButtonDisplay();
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
    var showApplicantsBtn = false;
    var showStartBtn = false;
    var showRequestCompletionBtn = false;
    var showConfirmCompletionBtn = false;
    var awaitingCustomerConfirmation = false;
    
    // 客户用户（老人或监护人）
    if (userType === 0 || userType === 1) {
      showApplicantsBtn = status === 0;
      showConfirmCompletionBtn = status === 2 && !!this.data.serviceData.completionRequestedAt;
      if (status === 0) {
        showModifyBtn = true; // 未指派时可修改；获批接单后需取消重新预约
      } else if (status === 3) {
        showPayBtn = true; // 待支付状态显示支付按钮
      } else if (status === 4) {
        showEvaluateBtn = true; // 待评价状态显示评价按钮
      }
    } 
    // 服务人员
    else if (userType === 2 || userType === 3 || userType === 4) {
      showStartBtn = status === 1;
      showRequestCompletionBtn = status === 2 && !this.data.serviceData.completionRequestedAt;
      awaitingCustomerConfirmation = status === 2 && !!this.data.serviceData.completionRequestedAt;
      if (status === 3 || status === 4) {
        showUploadBtn = true; // 服务人员在待支付或待评价状态可以上传服务记录
      }
    }
    
    this.setData({
      showModifyBtn: showModifyBtn,
      showPayBtn: showPayBtn,
      showEvaluateBtn: showEvaluateBtn,
      showUploadBtn: showUploadBtn,
      showApplicantsBtn: showApplicantsBtn,
      showStartBtn: showStartBtn,
      showRequestCompletionBtn: showRequestCompletionBtn,
      showConfirmCompletionBtn: showConfirmCompletionBtn,
      awaitingCustomerConfirmation: awaitingCustomerConfirmation
    });
  },

  // 三个独立业务动作：服务端校验身份和前置状态，前端不伪造状态。
  performFulfillmentAction: function(path, title, warning) {
    if (this.data.isLoading) return;
    wx.showModal({
      title: title,
      content: warning,
      success: result => {
        if (!result.confirm) return;
        this.setData({ isLoading: true });
        wx.request({
          url: app.globalData.baseUrl + '/api/services/' + this.data.serviceId + '/' + path,
          method: 'POST',
          header: { Authorization: wx.getStorageSync('token') },
          success: response => {
            if (response.statusCode === 200) {
              wx.showToast({ title: '操作已记录', icon: 'success' });
              this.fetchServiceFromServer(this.data.serviceId);
            } else {
              wx.showToast({ title: '操作失败，请刷新订单', icon: 'none' });
            }
          },
          fail: () => wx.showToast({ title: '网络请求失败', icon: 'none' }),
          complete: () => this.setData({ isLoading: false })
        });
      }
    });
  },

  onStartService: function() {
    this.performFulfillmentAction('start', '声明开始服务',
      '仅记录您的开始声明，系统不能证明您已经到场。请确认实际开始后再操作。');
  },

  onRequestCompletion: function() {
    this.performFulfillmentAction('request-completion', '提交完工声明',
      '此操作不代表服务已完成，仍需老人或监护人确认。');
  },

  onConfirmCompletion: function() {
    this.performFulfillmentAction('confirm-completion', '确认服务已完成',
      '请确认已实际收到服务；系统没有上传服务记录或到场证明。确认后进入待支付，但目前未开通真实支付。');
  },

  // 只向订单创建者/服务对象展示申请名单。身份是自报，批准不等于资质认证。
  loadApplications: function() {
    var token = wx.getStorageSync('token');
    wx.request({
      url: app.globalData.baseUrl + '/api/services/' + this.data.serviceId + '/applications',
      method: 'GET',
      header: { Authorization: token },
      success: res => {
        if (res.statusCode === 200 && Array.isArray(res.data.data)) {
          this.setData({ applications: res.data.data, applicationsLoaded: true });
        } else {
          wx.showToast({ title: '申请名单读取失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络请求失败', icon: 'none' })
    });
  },

  approveApplication: function(e) {
    if (this.data.approvingApplication) return;
    var applicationId = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '确认批准接单',
      content: '此操作会让该申请者看到老人姓名、预约住址等订单详情。员工身份目前未经平台资质核验，确定批准吗？',
      success: result => {
        if (!result.confirm) return;
        this.setData({ approvingApplication: true });
        wx.request({
          url: app.globalData.baseUrl + '/api/services/' + this.data.serviceId
            + '/applications/' + applicationId + '/approve',
          method: 'POST',
          header: { Authorization: wx.getStorageSync('token') },
          success: res => {
            if (res.statusCode === 200) {
              wx.showToast({ title: '已批准接单', icon: 'success' });
              this.setData({ applications: [], applicationsLoaded: false });
              this.fetchServiceFromServer(this.data.serviceId);
            } else {
              wx.showToast({ title: '批准失败，订单可能已分配', icon: 'none' });
            }
          },
          fail: () => wx.showToast({ title: '网络请求失败', icon: 'none' }),
          complete: () => this.setData({ approvingApplication: false })
        });
      }
    });
  },

  // 修改服务
  onModifyService: function() {
    var serviceId = this.data.serviceId;
    // 由编辑页单次读取原始服务端数据，避免二次请求和缓存回填旧状态。
    wx.navigateTo({
      url: '/pages/service_create/service_create?id=' + serviceId
    });
  },
  
  // 当前无真实支付渠道，不能模拟付款或推进订单状态。
  onPayment: function() {
    wx.showModal({
      title: '支付未开通',
      content: '本演示系统尚未接入微信支付，当前无法付款，订单状态不会改变。',
      showCancel: false
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
          break;
        }
      }
      
      if (!found) {
        // 如果缓存中没有找到该服务，则添加
        var serviceData = this.data.serviceData;
        serviceData.id = serviceId;
        serviceData.serviceId = serviceId;
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
  
  // 未接入文件接收与存储服务，不能模拟上传成功。
  onUploadRecord: function() {
    wx.showModal({
      title: '记录上传未开通',
      content: '当前没有服务端文件存储与确认接口，无法保存服务记录。',
      showCancel: false
    });
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
