var app = getApp();

// 补零函数，替代padStart
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

// 将本地时间转换为UTC时间的ISO字符串
function convertToUTCTime(dateStr) {
  const date = new Date(dateStr);
  console.log('原始日期字符串:', dateStr);
  console.log('解析后的本地日期对象:', date.toString());
  
  // 将本地时间转换为UTC时间，需要减去8小时
  const utcDate = new Date(date.getTime() - 8 * 60 * 60 * 1000);
  console.log('转换为UTC的日期对象:', utcDate.toString());
  console.log('转换为ISO字符串:', utcDate.toISOString());
  
  return utcDate.toISOString();
}

// 获取从当前时间开始的时间段
function getAvailableTimes(isToday) {
  const times = [];
  const now = new Date();
  const startHour = isToday ? now.getHours() : 8;
  const startMinute = isToday ? now.getMinutes() : 0;

  for (let h = startHour; h < 21; h++) { // 服务时间到晚上8点
    for (let m = 0; m < 60; m += 30) {
      if (isToday) {
        if (h === startHour && m < startMinute) {
          continue; // 跳过当前小时已过去的时间段
        }
      }
      if (h >= 8) { // 确保时间从8点开始
        times.push(`${padZero(h)}:${padZero(m)}`);
      }
    }
  }
  // 确保如果当前时间晚于服务时间，也提供一个默认选项或提示
  if (times.length === 0) {
    times.push('今日已无可预约时间');
  }
  return times;
}

Page({
  data: {
    formData: {  
      typeIndex: -1,
      timeIndex: [-1, -1],
      scheduledTime: '',
      address: '',
      remark: '',
      targetIndex: -1, // 服务对象索引
      targetId: '' // 服务对象ID
    },
    serviceTypes: ['生活照料', '医疗护理', '心理护理'],
    serviceTargets: [], // 服务对象列表
    serviceTargetNames: [], // 服务对象名称列表
    timeRange: [
      // 日期范围：未来7天
      (function() {
        var dateArr = [];
        for (var i = 0; i < 7; i++) {
          var date = new Date();
          date.setDate(date.getDate() + i);
          dateArr.push((date.getMonth() + 1) + '月' + date.getDate() + '日');
        }
        return dateArr;
      })(),
      // 时间范围，将动态生成
      []
    ],
    submitActive: false,
    isSubmitting: false,
    hasFormChanged: false, // 表单是否有修改
    isEdit: false, // 是否是编辑模式
    serviceId: '', // 服务ID（编辑模式下使用）
    originalFormData: null, // 原始表单数据（编辑模式下用于比较）
    hasTriedFetchingFromServer: false // 是否已经尝试过从服务器获取
  },

  onLoad: function(options) {
    var that = this;
    
    console.log('服务创建/编辑页面加载，接收到的参数:', options);
    
    // 初始化可选时间，默认是今天
    this.setData({
      'timeRange[1]': getAvailableTimes(true),
      hasTriedFetchingFromServer: false // 重置标志
    });
    
    // 初始化服务对象列表
    this.initServiceTargets();
    
    // 如果有缓存的地址，自动填充
    var userInfo = wx.getStorageSync('userInfo') || {};
    if (userInfo.address) {
      this.setData({
        'formData.address': userInfo.address
      });
    }
    
    // 检查是否是编辑模式
    if (options && options.id) {
      this.setData({
        isEdit: true,
        serviceId: options.id
      });
      
      console.log('编辑模式，服务ID:', options.id);
      
      // 加载服务详情
      this.loadServiceDetail(options.id);
    } else {
      // 创建模式下，设置表单已修改，以便可以提交
      this.setData({
        hasFormChanged: true
      });
      
      console.log('创建模式');
    }
  },
  
  // 初始化服务对象列表
  initServiceTargets: function() {
    var userInfo = wx.getStorageSync('userInfo') || {};
    // 确保userType存在，若不存在，说明用户信息异常，给予默认值或进行错误处理
    var userType = (userInfo && userInfo.userType !== null) ? userInfo.userType : 99;
    var bindings = wx.getStorageSync('bindInfo') || [];
    var targets = [];
    var targetNames = [];
    
    console.log('初始化服务对象列表，用户类型:', userType);
    console.log('用户信息:', userInfo);
    console.log('绑定信息:', bindings);
    
    // 如果是老人用户(userType=0)，可以选择自己
    if (userType === 0) {
      targets.push({
        id: String(userInfo.id || ''), // 确保ID是字符串
        name: '自己 (老人)'
      });
      targetNames.push('自己 (老人)');
    }
    
    // 从绑定关系中筛选出可以服务的对象
    // 如果当前用户是监护人(1)，服务对象是老人(0)
    // 如果当前用户是老人(0)，服务对象是监护人(1)，但一般服务是为老人创建的
    const activeBinds = bindings.filter(b => b.bind_status === 1);

    if (userType === 1 && activeBinds.length === 0) {
      wx.showModal({
        title: '无法创建服务',
        content: '您还没有绑定任何老人，请先去绑定。',
        confirmText: '去绑定',
        showCancel: false,
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/bind_list/bind_list',
            });
          }
        }
      });
      return; // 终止后续执行
    }

    activeBinds.forEach(binding => {
      // 监护人(1)的服务对象是老人
      // 老人(0)的服务对象也可以是自己，已经添加过了
      if (userType === 1) {
         targets.push({
          id: String(binding.id || ''), // 确保ID是字符串
          name: binding.name // 绑定对象的名字
        });
        targetNames.push(binding.name);
      }
    });
    
    console.log('初始化后的服务对象列表:', targets);
    
    this.setData({
      serviceTargets: targets,
      serviceTargetNames: targetNames
    });
  },
  
  // 加载服务详情
  loadServiceDetail: function(serviceId) {
    var cachedServices = wx.getStorageSync('serviceInfo') || [];
    var service = null;
    
    console.log('正在加载服务详情，ID:', serviceId);
    console.log('缓存中的服务列表:', cachedServices);
    
    // 从缓存中查找服务
    for (var i = 0; i < cachedServices.length; i++) {
      if (cachedServices[i].id === serviceId || cachedServices[i].serviceId === serviceId) {
        service = cachedServices[i];
        console.log('找到匹配的服务:', service);
        break;
      }
    }
    
    if (service) {
      // 找到服务对象的索引
      var targetIndex = -1;
      for (var i = 0; i < this.data.serviceTargets.length; i++) {
        if (this.data.serviceTargets[i].id === service.targetId) {
          targetIndex = i;
          break;
        }
      }
      
      // 找到服务类型的索引
      var typeIndex = -1;
      var serviceType = service.serviceType !== undefined ? service.serviceType : service.type;
      if (serviceType !== undefined) {
        typeIndex = parseInt(serviceType);
      }
      
      // 解析日期时间
      var scheduledTime = service.scheduledTime || '';
      var timeIndex = [-1, -1];
      
      if (scheduledTime) {
        // 尝试解析日期和时间
        try {
          var dateObj = new Date(scheduledTime);
          // 将UTC时间转换为北京时间
          dateObj = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
          
          // 找到日期索引
          for (var i = 0; i < 7; i++) {
            var compareDate = new Date();
            compareDate.setDate(compareDate.getDate() + i);
            
            if (dateObj.getDate() === compareDate.getDate() && 
                dateObj.getMonth() === compareDate.getMonth()) {
              timeIndex[0] = i;
              break;
            }
          }
          
          // 找到时间索引
          var hours = dateObj.getHours();
          var minutes = dateObj.getMinutes();
          var timeString = padZero(hours) + ':' + padZero(minutes);
          
          console.log('解析的时间:', timeString);
          console.log('可用时间列表:', this.data.timeRange[1]);
          
          for (var i = 0; i < this.data.timeRange[1].length; i++) {
            if (this.data.timeRange[1][i] === timeString) {
              timeIndex[1] = i;
              break;
            }
          }
        } catch (e) {
          console.error('解析日期时间失败:', e);
        }
      }
      
      // 设置表单数据
      var formData = {
        typeIndex: typeIndex,
        timeIndex: timeIndex,
        scheduledTime: scheduledTime,
        address: service.address || service.appointedAddress || '',
        remark: service.remark || service.serviceDes || '',
        targetIndex: targetIndex,
        targetId: service.targetId || ''
      };
      
      console.log('设置表单数据:', formData);
      
      // 对于编辑模式，我们需要设置isoScheduledTime，这样在提交时可以使用
      // 如果我们有原始的scheduledTime，就将其转换为UTC时间的ISO字符串
      if (scheduledTime) {
        try {
          // 尝试解析原始的scheduledTime
          var originalDate = new Date(scheduledTime);
          // 转换为UTC时间的ISO字符串，这样提交时可以使用
          formData.isoScheduledTime = originalDate.toISOString();
          console.log('设置isoScheduledTime:', formData.isoScheduledTime);
        } catch (e) {
          console.error('转换scheduledTime为ISO格式失败:', e);
        }
      }
      
      this.setData({
        formData: formData,
        originalFormData: JSON.parse(JSON.stringify(formData)), // 保存原始数据的副本
        hasFormChanged: false // 初始时表单未修改
      });
    } else {
      // 防止无限循环，检查是否已经尝试过从服务器获取
      if (this.data.hasTriedFetchingFromServer) {
        console.error('无法找到服务，即使从服务器获取也失败');
        wx.showToast({
          title: '无法找到服务信息',
          icon: 'none'
        });
        
        // 延迟返回
        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
        return;
      }
      
      // 未找到服务，尝试从服务器获取
      console.log('缓存中未找到服务，尝试从服务器获取');
      this.setData({ hasTriedFetchingFromServer: true });
      this.fetchServiceFromServer(serviceId);
    }
  },
  
  // 从服务器获取服务详情
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
        
        console.log('服务详情API响应:', res);
        console.log('服务详情数据:', res.data);
        
        if (res.statusCode === 200 && res.data) {
          var service = res.data; // 直接使用res.data，不需要res.data.service
          
          // 确保service对象包含所有必需的字段
          if (!service.id && service.serviceId) {
            service.id = service.serviceId;
          }
          
          if (!service.serviceId && service.id) {
            service.serviceId = service.id;
          }
          
          if (service.type === undefined && service.serviceType !== undefined) {
            service.type = service.serviceType;
          }
          
          if (service.serviceType === undefined && service.type !== undefined) {
            service.serviceType = service.type;
          }
          
          if (!service.address && service.appointedAddress) {
            service.address = service.appointedAddress;
          }
          
          if (!service.appointedAddress && service.address) {
            service.appointedAddress = service.address;
          }
          
          if (!service.remark && service.serviceDes) {
            service.remark = service.serviceDes;
          }
          
          if (!service.serviceDes && service.remark) {
            service.serviceDes = service.remark;
          }
          
          console.log('处理后的服务数据:', service);
          
          // 将获取的服务添加到缓存
          var cachedServices = wx.getStorageSync('serviceInfo') || [];
          var found = false;
          
          // 检查是否已存在
          for (var i = 0; i < cachedServices.length; i++) {
            if (cachedServices[i].id === service.id || 
                cachedServices[i].serviceId === service.serviceId || 
                cachedServices[i].id === parseInt(service.id) || 
                cachedServices[i].serviceId === parseInt(service.serviceId)) {
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
          
          // 重新加载服务详情
          that.loadServiceDetail(serviceId);
        } else {
          console.error('获取服务详情失败:', res);
          wx.showToast({
            title: (res.data && res.data.message) || '获取服务详情失败',
            icon: 'none'
          });
          
          setTimeout(function() {
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('获取服务详情失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        
        setTimeout(function() {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  // 输入框内容变化
  onInput: function(e) {
    var field = e.currentTarget.dataset.field;
    var value = e.detail.value;
    
    var data = {};
    data['formData.' + field] = value;
    
    this.setData(data);
    
    // 检查表单是否有修改
    if (this.data.isEdit) {
      this.checkFormChanged();
    } else {
      this.setData({
        hasFormChanged: true
      });
    }
  },

  // 服务类型选择
  onTypeChange: function(e) {
    var value = e.detail.value;
    
    // 如果是编辑模式且服务类型不可修改，则不更新
    if (this.data.isEdit) {
      wx.showToast({
        title: '服务类型不可修改',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      'formData.typeIndex': value,
      hasFormChanged: true
    });
  },
  
  // 服务对象选择变化
  onTargetChange: function(e) {
    var value = e.detail.value;
    
    // 编辑模式下不允许修改服务对象
    if (this.data.isEdit) {
      wx.showToast({
        title: '服务对象不可修改',
        icon: 'none'
      });
      return;
    }
    
    if (value >= 0 && value < this.data.serviceTargets.length) {
      var targetId = this.data.serviceTargets[value].id;
      console.log('选择的服务对象:', this.data.serviceTargets[value]);
      console.log('服务对象ID:', targetId, '类型:', typeof targetId);
      
      // 确保targetId是字符串类型
      if (targetId !== undefined && targetId !== null) {
        targetId = String(targetId);
      }
      
      this.setData({
        'formData.targetIndex': value,
        'formData.targetId': targetId,
        hasFormChanged: true
      });
    }
  },

  // 时间选择变化
  onTimeChange: function(e) {
    var val = e.detail.value;
    var datePart = this.data.timeRange[0][val[0]];
    var timePart = this.data.timeRange[1][val[1]];

    // 重新获取当前年份
    var year = new Date().getFullYear();
    // 注意：这里的月份和日期解析需要健壮，因为它依赖于 'M月d日' 格式
    var month = parseInt(datePart.split('月')[0]);
    var day = parseInt(datePart.split('月')[1].replace('日', ''));

    if (!timePart || timePart.includes('今日已无可预约时间')) {
      wx.showToast({
        title: '请选择一个有效的时间',
        icon: 'none'
      });
      this.setData({
        'formData.timeIndex': val
      });
      return;
    }
    
    var scheduledTimeStr = `${year}-${padZero(month)}-${padZero(day)}T${timePart}:00`;
    console.log('构建的本地时间字符串:', scheduledTimeStr);

    this.setData({
      'formData.timeIndex': val,
      'formData.scheduledTime': `${datePart} ${timePart}`
    });

    // 存储一个ISO格式的时间，用于后续提交给后端
    try {
      // 转换为ISO格式的UTC时间
      var isoTime = convertToUTCTime(scheduledTimeStr);
      console.log('转换后的ISO格式UTC时间:', isoTime);
      
      this.setData({
        'formData.isoScheduledTime': isoTime
      });
    } catch (e) {
      console.error('时间转换失败:', e);
      wx.showToast({
        title: '时间格式错误，请重新选择',
        icon: 'none'
      });
    }

    if (this.data.isEdit) {
      this.checkFormChanged();
    } else {
      this.setData({
        hasFormChanged: true
      });
    }
  },

  // 当时间选择器的列发生变化时
  onTimeColumnChange: function(e) {
    var column = e.detail.column;
    var value = e.detail.value;

    // 如果是第一列（日期）发生变化
    if (column === 0) {
      var isToday = (value === 0);
      this.setData({
        'timeRange[1]': getAvailableTimes(isToday)
      });
    }
  },

  // 检查表单是否有修改（编辑模式）
  checkFormChanged: function() {
    var formData = this.data.formData;
    var originalData = this.data.originalFormData;
    
    if (!originalData) return;
    
    var changed = 
      formData.scheduledTime !== originalData.scheduledTime ||
      formData.address !== originalData.address ||
      formData.remark !== originalData.remark;
    
    this.setData({
      hasFormChanged: changed
    });
  },

  // 提交按钮触摸开始
  onSubmitTouchStart: function() {
    this.setData({ submitActive: true });
  },

  // 提交按钮触摸结束
  onSubmitTouchEnd: function() {
    this.setData({ submitActive: false });
  },

  // 表单提交
  onSubmit: function(e) {
    if (this.data.isSubmitting || (this.data.isEdit && !this.data.hasFormChanged)) {
      return;
    }
    
    // 表单验证
    if (this.data.formData.typeIndex === -1) {
      this.showToastError('请选择服务类型');
      return;
    }
    
    if (this.data.formData.timeIndex[0] === -1) {
      this.showToastError('请选择预约时间');
      return;
    }
    
    if (!this.data.formData.address) {
      this.showToastError('请输入服务地址');
      return;
    }
    
    if (this.data.formData.targetIndex === -1 || !this.data.formData.targetId) {
      this.showToastError('请选择服务对象');
      return;
    }

    this.setData({
      isSubmitting: true
    });

    var token = wx.getStorageSync('token');
    var serviceId = this.data.serviceId;
    var url = this.data.isEdit ? 
              `${app.globalData.baseUrl}/api/services/update/${serviceId}` :
              `${app.globalData.baseUrl}/api/services/create`;
    var method = this.data.isEdit ? 'POST' : 'POST'; // 根据后端代码，更新也是POST

    console.log('提交服务数据，URL:', url);

    // 确保targetId存在且有效
    var targetId = this.data.formData.targetId;
    if (!targetId && this.data.formData.targetIndex >= 0 && 
        this.data.formData.targetIndex < this.data.serviceTargets.length) {
      targetId = this.data.serviceTargets[this.data.formData.targetIndex].id;
      console.log('从serviceTargets获取targetId:', targetId);
    }

    var dataToSend = {
      type: String(this.data.formData.typeIndex), // 转换为字符串
      scheduledTime: this.data.formData.isoScheduledTime, // 使用ISO格式的时间
      address: this.data.formData.address,
      remark: this.data.formData.remark
    };

    // 只在创建服务时设置targetId，编辑服务时不修改targetId
    if (!this.data.isEdit) {
      dataToSend.targetId = String(targetId || ''); // 转换为字符串，确保非空
      dataToSend.providerId = "5"; // 创建服务时默认设置服务人员ID为5
    }

    console.log('发送的数据:', dataToSend);
    console.log('数据类型检查:');
    console.log('- type:', typeof dataToSend.type, dataToSend.type);
    console.log('- scheduledTime:', typeof dataToSend.scheduledTime, dataToSend.scheduledTime);
    console.log('- address:', typeof dataToSend.address, dataToSend.address);
    console.log('- remark:', typeof dataToSend.remark, dataToSend.remark);
    if (!this.data.isEdit) {
      console.log('- targetId:', typeof dataToSend.targetId, dataToSend.targetId);
      console.log('- providerId:', typeof dataToSend.providerId, dataToSend.providerId);
    }

    wx.request({
      url: url,
      method: method,
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      data: dataToSend,
      success: (res) => {
        console.log('服务提交响应:', res);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({
            title: this.data.isEdit ? '修改成功' : '创建成功',
            icon: 'success'
          });
          
          // 清除缓存的服务信息以触发刷新
          wx.removeStorageSync('serviceInfo');

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/service_list/service_list'
            });
          }, 1500);
        } else {
          console.error('服务提交失败，状态码:', res.statusCode, '响应:', res.data);
          let errorMessage = '未知错误';
          
          if (res.data && res.data.message) {
            errorMessage = res.data.message;
          } else if (res.statusCode === 400) {
            errorMessage = '请求参数错误';
          } else if (res.statusCode === 401) {
            errorMessage = '未授权，请重新登录';
          } else if (res.statusCode === 403) {
            errorMessage = '无权操作此服务';
          } else if (res.statusCode === 404) {
            errorMessage = '服务不存在';
          } else if (res.statusCode === 500) {
            errorMessage = '服务器错误';
          }
          
          wx.showToast({
            title: this.data.isEdit ? `修改失败: ${errorMessage}` : `创建失败: ${errorMessage}`,
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (err) => {
        console.error('服务操作失败', err);
        wx.showToast({
          title: '网络错误，请稍后再试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isSubmitting: false
        });
      }
    });
  },

  // 显示错误提示
  showToastError: function(message) {
    wx.showToast({
      title: message,
      icon: 'none'
    });
  },

  // 更新本地服务缓存
  updateLocalServiceCache: function(newService, isEdit) {
    try {
      // 获取现有缓存
      var cachedServices = wx.getStorageSync('serviceInfo') || [];
      
      if (isEdit) {
        // 修改模式：更新现有服务
        for (var i = 0; i < cachedServices.length; i++) {
          if (cachedServices[i].id === this.data.serviceId) {
            cachedServices[i].type = newService.type;
            cachedServices[i].scheduledTime = newService.scheduled_time;
            cachedServices[i].address = newService.address;
            cachedServices[i].remark = newService.remark;
            cachedServices[i].targetId = newService.target_id;
            // 使用北京时间
            cachedServices[i].updateTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString();
            break;
          }
        }
      } else {
        // 创建模式：添加新服务
        var targetName = '';
        if (this.data.formData.targetIndex >= 0 && this.data.formData.targetIndex < this.data.serviceTargets.length) {
          targetName = this.data.serviceTargets[this.data.formData.targetIndex].name;
        }
        
        cachedServices.unshift({
          id: newService.id || 'temp_' + Date.now(),
          type: newService.type,
          scheduledTime: newService.scheduled_time,
          address: newService.address,
          remark: newService.remark,
          status: newService.status,
          targetId: newService.target_id,
          targetName: targetName,
          // 使用北京时间
          createTime: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString()
        });
      }
      
      // 更新缓存
      wx.setStorageSync('serviceInfo', cachedServices);
      console.log('已更新服务缓存:', cachedServices);
    } catch (error) {
      console.error('更新服务缓存失败:', error);
    }
  }
}); 