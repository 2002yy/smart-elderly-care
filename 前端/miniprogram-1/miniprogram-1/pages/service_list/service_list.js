const app = getApp();
const { formatBeijingTime } = require('../../utils/serviceTime.js');

Page({
  data: {
    currentStatus: 1, // 当前选中的状态，默认为待进行
    services: [], // 所有服务列表
    filteredServices: [], // 当前状态下的服务列表
    isClientUser: false, // 是否为老人或监护人用户
    userType: 0, // 用户类型
    isLoading: true, // 是否正在加载数据
    loadingMore: false,
    refreshing: false, // 是否正在下拉刷新
    page: 1,
    pageSize: 10,
    hasMore: true,
    addBtnActive: false
  },

  onLoad() {
    this.initUserInfo();
  },

  onShow() {
    this.initUserInfo();
    
    // 检查全局数据中是否有要选中的状态
    const selectedStatus = getApp().globalData.selectedServiceStatus;
    if (selectedStatus !== undefined && selectedStatus !== this.data.currentStatus) {
      this.setData({
        currentStatus: selectedStatus,
        page: 1,
        hasMore: true
      });
      // 清除全局数据中的状态
      getApp().globalData.selectedServiceStatus = undefined;
    }
    
    this.loadServices();
  },

  onRefresh() {
    console.log('刷新服务列表');
    // 清除缓存，确保获取最新数据
    wx.removeStorageSync('serviceInfo');
    // 重新加载服务
    this.loadServices();
  },

  // 初始化用户信息
  initUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    const userType = userInfo.userType;
    
    // 判断是否为老人或监护人用户 (userType = 0 或 1)
    const isClientUser = userType === 0 || userType === 1;
    
    this.setData({
      userType,
      isClientUser
    });
  },

  // 这部分代码已被loadServices函数替代

  // 处理请求错误
  handleRequestError(message) {
    this.setData({
      isLoading: false,
      refreshing: false
    });
    
    wx.showToast({
      title: message,
      icon: 'none'
    });
  },

  // 切换状态
  switchStatus(e) {
    const status = Number(e.currentTarget.dataset.status);
    if (status === this.data.currentStatus) return;
    
    this.setData({
      currentStatus: status,
      page: 1,
      hasMore: true
    });
    
    this.loadServices(1);
  },

  // 根据当前状态筛选服务
  filterServices() {
    const { services, currentStatus } = this.data;
    let filtered = [];
    
    
    if (currentStatus === 1) {
      // 待进行服务，包括状态为0（未指派）和1（待进行）的服务
      filtered = services.filter(service => 
        service.status === 0 || service.status === 1 || 
        service.serviceStatus === 0 || service.serviceStatus === 1
      );
    } else {
      // 其他状态直接匹配
      filtered = services.filter(service => 
        service.status === currentStatus || service.serviceStatus === currentStatus
      );
    }
    
    
    this.setData({
      filteredServices: filtered
    });
  },

  // 获取状态文本
  getStatusText(status) {
    switch (parseInt(status)) {
      case 0: return '未指派';
      case 1: return '待进行';
      case 2: return '进行中';
      case 3: return '待支付';
      case 4: return '待评价';
      case 5: return '已完成';
      default: return '未知状态';
    }
  },

  // 获取状态样式类
  getStatusClass(status) {
    switch (parseInt(status)) {
      case 0: return 'status-pending';
      case 1: return 'status-pending';
      case 2: return 'status-ongoing';
      case 3: return 'status-payment';
      case 4: return 'status-review';
      case 5: return 'status-completed';
      default: return '';
    }
  },

  // 查看服务详情
  navigateToDetail(e) {
    const serviceId = e.currentTarget.dataset.id;
    console.log('正在跳转到服务详情页，ID:', serviceId);
    
    // 确保缓存中有这个服务的数据
    const cachedServices = wx.getStorageSync('serviceInfo') || [];
    const service = cachedServices.find(s => 
      s.id === serviceId || 
      s.serviceId === serviceId || 
      s.id === parseInt(serviceId) || 
      s.serviceId === parseInt(serviceId)
    );
    
    if (service) {
      wx.navigateTo({
        url: `/pages/service_detail/service_detail?id=${serviceId}`
      });
    } else {
      // 如果缓存中没有找到，刷新列表后再跳转
      wx.showToast({
        title: '正在刷新服务数据...',
        icon: 'loading',
        duration: 1000
      });
      
      // 清除缓存并重新加载
      wx.removeStorageSync('serviceInfo');
      this.loadServices();
      
      // 延迟导航，给loadServices一些时间来更新缓存
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/service_detail/service_detail?id=${serviceId}`
        });
      }, 1500);
    }
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.isLoading || this.data.loadingMore) return;
    this.loadServices(this.data.page + 1);
  },

  // 添加按钮触摸开始
  onAddBtnTouchStart() {
    this.setData({ addBtnActive: true });
  },

  // 添加按钮触摸结束
  onAddBtnTouchEnd() {
    this.setData({ addBtnActive: false });
  },

  // 添加按钮点击
  onAddService() {
    wx.navigateTo({
      url: '/pages/service_create/service_create'
    });
  },

  openServiceMarket() {
    wx.navigateTo({ url: '/pages/service_market/service_market' });
  },

  // 加载服务列表
  loadServices: function(requestedPage = 1) {
    var that = this;
    var token = wx.getStorageSync('token');
    var status = this.data.currentStatus;
    var requestVersion = (this._serviceRequestVersion || 0) + 1;
    this._serviceRequestVersion = requestVersion;

    if (requestedPage === 1) {
      this.setData({page: 1, hasMore: true, isLoading: true, loadingMore: false,
                    services: [], filteredServices: []});
    } else {
      this.setData({loadingMore: true});
    }
    
    if (!token) {
      this.setData({isLoading: false, loadingMore: false});
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    if (requestedPage === 1) wx.showLoading({title: '加载中...'});
    
    wx.request({
      url: app.globalData.baseUrl + '/api/services',
      method: 'GET',
      data: {page: requestedPage, pageSize: this.data.pageSize, status: status},
      header: {
        'Authorization': token
      },
      success: function(res) {
        if (requestVersion !== that._serviceRequestVersion) return;
        if (requestedPage === 1) wx.hideLoading();
        
        if (res.statusCode === 200 && res.data && res.data.data) {
          
          var services = res.data.data.map(function(item) {
            // 后端是 UTC Instant，这里统一以北京时间显示。
            if (item.scheduledTime) {
              item.formattedTime = formatBeijingTime(item.scheduledTime) + '（北京时间）';
              item.scheduledTime = item.formattedTime;
            }
            
            // 设置状态文本
            item.statusText = that.getStatusText(item.serviceStatus);
            
            // 设置服务提供者名称
            if (item.serviceStatus === 0) {
              item.providerName = '待分配';
            }
            
            // 确保id字段存在
            if (!item.id && item.serviceId) {
              item.id = item.serviceId;
            }
            
            // 确保type字段存在
            if (item.serviceType !== undefined && item.type === undefined) {
              item.type = item.serviceType;
            }
            
            // 确保status字段存在
            if (item.serviceStatus !== undefined && item.status === undefined) {
              item.status = item.serviceStatus;
            }
            
            // 确保address字段存在
            if (item.appointedAddress && !item.address) {
              item.address = item.appointedAddress;
            }
            
            // 确保staffName字段存在
            if (item.providerName && !item.staffName) {
              item.staffName = item.providerName;
            }
            
            // 确保clientName字段存在
            if (item.targetName && !item.clientName) {
              item.clientName = item.targetName;
            }
            
            return item;
          });
          
          var loadedServices = requestedPage === 1 ? services : that.data.services.concat(services);
          // 缓存与页面始终表示已从服务器取得的订单，而不是假设后续页存在。
          wx.setStorageSync('serviceInfo', loadedServices);
          
          that.setData({
            services: loadedServices,
            page: requestedPage,
            hasMore: requestedPage * that.data.pageSize < res.data.total,
            isLoading: false,
            loadingMore: false,
            refreshing: false
          });
          
          // 过滤服务
          that.filterServices();
          
        } else {
          that.setData({
            isLoading: false,
            loadingMore: false,
            refreshing: false
          });
          
          wx.showToast({
            title: res.data.message || '获取服务列表失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        if (requestVersion !== that._serviceRequestVersion) return;
        if (requestedPage === 1) wx.hideLoading();
        
        that.setData({
          isLoading: false,
          loadingMore: false,
          refreshing: false
        });
        
        console.error('获取服务列表失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  }
});
