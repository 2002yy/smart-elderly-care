Page({
  data: {
    options: ['老人', '监护人', '日常类员工', '护理类员工', '精神服务类员工'],
    userInfo: {
      userType: '',
      gender: '',
      phone: '',
      nickname: '',
      age: '',
      region: [],
      address: '',
      avatarurl: ''
    },
    originalUserInfo: {}, // 存储原始用户信息，用于比较是否有修改
    formChanged: false, // 表单是否被修改
    showTypeSelector: false, // 是否显示身份选择器
    isUpdating: false, // 是否是更新个人信息
    selectedTypeName: '' // 选中的身份名称
  },

  onLoad(options) {
    // 从缓存加载完整的用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 确保数据结构一致性
    const formattedUserInfo = {
      userType: userInfo.userType !== undefined ? userInfo.userType : '',
      gender: userInfo.gender || '',
      // 处理可能存在的字段名不一致问题
      phone: userInfo.phone || userInfo.phoneNumber || '',
      nickname: userInfo.nickname || '',
      age: userInfo.age || '',
      address: userInfo.address || '',
      avatarurl: userInfo.avatarurl || '',
      region: []
    };
    
    // 检查是否是更新个人信息
    const isUpdating = formattedUserInfo.userType !== undefined && formattedUserInfo.userType !== 99;
    
    // 如果是新用户，设置默认userType
    if (!isUpdating && !formattedUserInfo.userType && formattedUserInfo.userType !== 0) {
      formattedUserInfo.userType = 0;
    }
    
    // 检查并转换 region 格式（从字符串到数组）
    if (userInfo.region) {
      if (typeof userInfo.region === 'string') {
        formattedUserInfo.region = userInfo.region.split(' '); // 将字符串按空格分割为数组
      } else if (Array.isArray(userInfo.region)) {
        formattedUserInfo.region = userInfo.region;
      }
    }
    
    // 保存原始用户信息，用于后续比较
    const originalUserInfo = JSON.parse(JSON.stringify(formattedUserInfo));
    
    // 根据userType判断是否显示身份选择器
    // userType为99时显示可编辑选择器，为0-4时显示但不可编辑
    const showTypeSelector = formattedUserInfo.userType === 99 || isUpdating;
    
    // 设置选中的身份名称
    let selectedTypeName = '';
    if (formattedUserInfo.userType !== undefined && formattedUserInfo.userType !== 99) {
      selectedTypeName = this.data.options[formattedUserInfo.userType];
    }
    
    this.setData({ 
      userInfo: formattedUserInfo,
      originalUserInfo,
      showTypeSelector,
      isUpdating,
      selectedTypeName
    });
  },

  // 检查表单是否有修改
  checkFormChanged() {
    const current = this.data.userInfo;
    const original = this.data.originalUserInfo;
    
    // 比较每个字段是否有变化
    const changed = 
      current.userType !== original.userType ||
      current.gender !== original.gender ||
      current.phone !== original.phone ||
      current.nickname !== original.nickname ||
      current.age !== original.age ||
      current.address !== original.address ||
      current.avatarurl !== original.avatarurl ||
      JSON.stringify(current.region) !== JSON.stringify(original.region);
    
    this.setData({ formChanged: changed });
  },

  // 处理头像点击，重新选择头像
  onAvatarTap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'front',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          'userInfo.avatarurl': tempFilePath
        });
        this.checkFormChanged();
      }
    });
  },

  // 处理身份选择
  onTypeChange(e) {
    const selectedIndex = e.detail.value;
    const selectedType = this.data.options[selectedIndex];
    
    this.setData({
      'userInfo.userType': selectedIndex, // 存储索引值作为userType
      selectedTypeName: selectedType // 存储显示名称
    });
    this.checkFormChanged();
  },
  
  // 处理头像上传
  onAvatarInput(e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({
      'userInfo.avatarurl': avatarUrl
    });
    this.checkFormChanged();
  },

  // 处理手机号输入
  onPhoneInput(e) {
    this.setData({
      'userInfo.phone': e.detail.value
    });
    this.checkFormChanged();
  },

  // 处理昵称输入
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickname': e.detail.value
    });
    this.checkFormChanged();
  },

  // 处理年龄输入
  onAgeInput(e) {
    this.setData({
      'userInfo.age': e.detail.value
    });
    this.checkFormChanged();
  },

  // 处理模糊地址选择
  onAddressChange(e) {
    this.setData({
      'userInfo.region': e.detail.value
    });
    this.checkFormChanged();
  },

  // 处理详细地址输入
  onAddressInput(e) {
    this.setData({
      'userInfo.address': e.detail.value
    });
    this.checkFormChanged();
  },

  // 处理性别选择
  selectGender(e) {
    const selectedGender = e.currentTarget.dataset.gender;
    this.setData({
      'userInfo.gender': selectedGender
    });
    this.checkFormChanged();
  },

  // 验证表单数据
  validateForm() {
    const { avatarurl, userType, gender, phone, nickname, age, region, address } = this.data.userInfo;

    // 检查必填项（直接从userInfo中获取头像URL）
    if ( userType === '' || !gender || !phone || !nickname || !age || !region.length || !address) {
      return {
        valid: false,
        message: '请填写完整信息'
      };
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        valid: false,
        message: '手机号格式不正确'
      };
    }

    // 验证年龄
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return {
        valid: false,
        message: '请输入有效的年龄（1-120岁）'
      };
    }

    return {
      valid: true
    };
  },

  // 处理表单提交
  handleSubmit() {
    const validation = this.validateForm();
    if (!validation.valid) {
      wx.showToast({
        title: validation.message,
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认提交',
      content: '请确认信息无误后提交',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: this.data.isUpdating ? '更新中...' : '注册中...'
          });
          this.sendDataToServer(this.data.userInfo);
        }
      }
    });
  },

  // 注销用户
  onDeregister() {
    wx.showModal({
      title: '确认注销',
      content: '此操作将清除您的所有信息且无法恢复，确定要注销吗？',
      confirmColor: '#e64340',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '注销中...' });
          // 简化注销数据，只发送必要信息
          const deregisterData = {
            action: 'deregister'
          };
          this.sendDataToServer(deregisterData, true);
        }
      }
    });
  },

  // 过滤不需要的字段
  filterUserData(data) {
    const { avatarurl, ...restData } = data;
    
    // 检查是否已经有phoneNumber字段
    if (restData.phoneNumber !== undefined) {
      // 已经有phoneNumber字段，直接返回
      return restData;
    } else if (restData.phone !== undefined) {
      // 有phone字段，需要转换为phoneNumber
      const { phone, ...otherData } = restData;
      return {
        ...otherData,
        phoneNumber: phone
      };
    } else {
      // 两个字段都没有，直接返回
      return restData;
    }
  },


  // 发送信息到服务器
  sendDataToServer(data, isDeregister = false) {
    const token = wx.getStorageSync('token') || '';
    
    // 根据操作类型选择不同的URL
    const baseUrl = getApp().globalData.baseUrl;
    const url = baseUrl + '/signup';

    // 在 sendDataToServer 中使用
    const filteredData = this.filterUserData(data);
    wx.request({
      url: url,
      method: 'POST', // 假设更新和注销都用 POST
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      data: filteredData,
      success: (res) => {
        if (res.statusCode === 200) {
          if (isDeregister) {
            // 注销成功
            wx.clearStorageSync(); // 清除所有缓存
            wx.showToast({ title: '注销成功', icon: 'success' });
            setTimeout(() => {
              wx.reLaunch({ url: '/pages/login/login' });
            }, 1500);
          } else {
            // 更新成功
            wx.setStorageSync('userInfo', this.data.userInfo); // 更新缓存
            wx.showToast({ title: '更新成功', icon: 'success' });

            // 判断是新注册用户还是更新信息
            if (!this.data.isUpdating) {
              // 新用户注册成功，跳转到首页
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/index/index',
                  success: () => {
                    // 获取当前页面栈
                    const pages = getCurrentPages();
                    // 找到首页和个人信息页并刷新
                    pages.forEach(page => {
                      if (page.route === 'pages/index/index' || page.route === 'pages/info/info') {
                        if (typeof page.onRefresh === 'function') {
                          page.onRefresh();
                        } else if (typeof page.onShow === 'function') {
                          page.onShow();
                        }
                      }
                    });
                  }
                });
              }, 1500);
            } else {
              // 通知前一个页面刷新
              const pages = getCurrentPages();
              if (pages.length > 1) {
                const prevPage = pages[pages.length - 2];
                if (typeof prevPage.onRefresh === 'function') {
                  prevPage.onRefresh();
                }
              }

              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          }
        } else {
          wx.showToast({
            title: (res.data && res.data.message) || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('操作失败', err);
        let errorMsg = '网络请求失败';
        if (err && err.errMsg) {
          errorMsg += ': ' + err.errMsg;
        }
        wx.showToast({ 
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});