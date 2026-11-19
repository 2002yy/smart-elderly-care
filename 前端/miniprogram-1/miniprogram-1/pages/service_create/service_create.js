var app = getApp();
const { beijingCalendarDay, beijingClock, beijingWallTimeToIso, formatBeijingTime } = require('../../utils/serviceTime.js');

// 补零函数，替代padStart
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

// 获取从当前时间开始的时间段
function getAvailableTimes(isToday) {
  const times = [];
  const now = beijingClock();
  const startHour = isToday ? now.hour : 8;
  const startMinute = isToday ? now.minute : 0;

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
          var date = beijingCalendarDay(i);
          dateArr.push(date.month + '月' + date.date + '日');
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
    originalFormData: null // 原始表单数据（编辑模式下用于比较）
  },

  onLoad: function(options) {
    var that = this;
    
    console.log('服务创建/编辑页面加载，接收到的参数:', options);
    
    // 初始化可选时间，默认是今天
    this.setData({
      'timeRange[1]': getAvailableTimes(true),
      isEdit: Boolean(options && options.id),
      serviceId: options && options.id ? options.id : ''
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
      console.log('编辑模式，服务ID:', options.id);
      
      // 编辑必须读取服务端原始 ISO 时间及最新权限/状态；列表缓存是展示数据，不可当编辑源。
      this.fetchServiceFromServer(options.id);
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

    if (userType === 1 && activeBinds.length === 0 && !this.data.isEdit) {
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
        if (binding.partnerId == null) {
          console.warn('绑定缓存缺少服务对象用户ID，请重新登录刷新绑定信息');
          return;
        }
        targets.push({
          id: String(binding.partnerId), // 用户ID；binding.id 是绑定记录ID
          name: binding.name // 绑定对象的名字
        });
        targetNames.push(binding.name);
      }
    });

    if (userType === 1 && activeBinds.length > 0 && targets.length === 0) {
      wx.showToast({ title: '绑定信息已过期，请重新登录', icon: 'none' });
    }
    
    
    this.setData({
      serviceTargets: targets,
      serviceTargetNames: targetNames
    });
  },
  
  // 只使用服务端响应回填编辑表单，避免数字/字符串 ID 不匹配及缓存的展示时间污染。
  applyServiceDetail: function(service) {
      // 找到服务对象的索引
      var targetIndex = -1;
      for (var i = 0; i < this.data.serviceTargets.length; i++) {
        if (String(this.data.serviceTargets[i].id) === String(service.targetId)) {
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
          var localScheduledTime = formatBeijingTime(scheduledTime, true);
          var scheduledDay = localScheduledTime.slice(0, 10);
          var timeString = localScheduledTime.slice(11);
          
          // 找到日期索引
          for (var i = 0; i < 7; i++) {
            var compareDate = beijingCalendarDay(i);
            var comparedDay = `${compareDate.year}-${padZero(compareDate.month)}-${padZero(compareDate.date)}`;
            if (scheduledDay === comparedDay) {
              timeIndex[0] = i;
              break;
            }
          }
          
          // 找到时间索引
          var availableTimes = getAvailableTimes(timeIndex[0] === 0);
          this.setData({ 'timeRange[1]': availableTimes });
          
          for (var i = 0; i < availableTimes.length; i++) {
            if (availableTimes[i] === timeString) {
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
        scheduledTime: formatBeijingTime(scheduledTime, true) || '',
        address: service.address || service.appointedAddress || '',
        remark: service.remark || service.serviceDes || '',
        targetIndex: targetIndex,
        targetId: service.targetId || '',
        targetName: service.targetName || '当前服务对象',
        isoScheduledTime: scheduledTime
      };
      
      this.setData({
        formData: formData,
        originalFormData: JSON.parse(JSON.stringify(formData)), // 保存原始数据的副本
        hasFormChanged: false // 初始时表单未修改
      });
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
        
        
        if (res.statusCode === 200 && res.data) {
          that.applyServiceDetail(res.data.service || res.data);
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

    // 使用北京时间的日历日，避免跨年时仍把 1 月预约算成上一年。
    var selectedDay = beijingCalendarDay(Number(val[0]));
    var year = selectedDay.year;
    var month = selectedDay.month;
    var day = selectedDay.date;

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
      var isoTime = beijingWallTimeToIso(scheduledTimeStr);
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
      formData.isoScheduledTime !== originalData.isoScheduledTime ||
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
    
    // 编辑已有预约时，时间可能已超出新建预约的未来七天选择范围；
    // 允许保留服务端原定时间，仅在用户主动改期时使用新的选择值。
    if (!this.data.formData.isoScheduledTime
        || (!this.data.isEdit && this.data.formData.timeIndex[0] === -1)) {
      this.showToastError('请选择预约时间');
      return;
    }
    
    if (!this.data.formData.address) {
      this.showToastError('请输入服务地址');
      return;
    }
    
    if ((!this.data.isEdit && this.data.formData.targetIndex === -1)
        || !this.data.formData.targetId) {
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
    }

    console.log('数据类型检查:');
    console.log('- type:', typeof dataToSend.type, dataToSend.type);
    console.log('- scheduledTime:', typeof dataToSend.scheduledTime, dataToSend.scheduledTime);
    if (!this.data.isEdit) {
      console.log('- targetId:', typeof dataToSend.targetId, dataToSend.targetId);
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
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({
            title: this.data.isEdit ? '修改成功' : '创建成功',
            icon: 'success'
          });
          
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
  }
});
