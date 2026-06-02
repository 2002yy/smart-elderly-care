Page({
  data: {
    isEdit: false,
    formData: {
      title: '',
      address: '',
      deviceInfo: '',
      emergencyNote: '',
      medicalHistory: '',
      otherNotes: ''
    },
    submitActive: false,
    // 血型选项
    bloodTypes: ['A型', 'B型', 'AB型', 'O型', 'Rh阴性', '其他'],
    // 紧急医疗信息表单数据
    emergencyInfo: {
      bloodType: '',
      allergies: '',
      basicDiseases: '',
      surgeryHistory: '',
      medication: '',
      emergencyNotes: ''
    },
    // 原始表单数据，用于检测变化
    originalEmergencyInfo: {},
    // 表单是否有变化
    formChanged: false,
    // 加载状态
    loading: false
  },

  onLoad() {
    // 从后端获取紧急医疗信息
    this.fetchEmergencyInfo();
  },

  // 从后端获取紧急医疗信息
  fetchEmergencyInfo() {
    this.setData({ loading: true });
    
    // 获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 获取全局配置中的baseUrl
    const app = getApp();
    const baseUrl = app.globalData.baseUrl || 'http://localhost:8081';
    
    wx.request({
      url: `${baseUrl}/api/emergency/info`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.emergencyInfo) {
          // 从后端获取数据成功
          const emergencyInfo = res.data.emergencyInfo;
          
          // 保存到本地缓存
          wx.setStorageSync('emergencyInfo', emergencyInfo);
          
          // 保存原始数据用于比较
          const originalEmergencyInfo = JSON.parse(JSON.stringify(emergencyInfo));
          
          this.setData({
            emergencyInfo,
            originalEmergencyInfo,
            formChanged: false
          });
        } else {
          // 获取失败，尝试从本地缓存加载
          this.loadEmergencyInfoFromCache();
          console.error('获取紧急医疗信息失败:', res);
        }
      },
      fail: (err) => {
        // 请求失败，尝试从本地缓存加载
        this.loadEmergencyInfoFromCache();
        console.error('请求紧急医疗信息失败:', err);
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 从缓存加载数据（作为后备方案）
  loadEmergencyInfoFromCache() {
    const emergencyInfo = wx.getStorageSync('emergencyInfo') || {
      bloodType: '',
      allergies: '',
      basicDiseases: '',
      surgeryHistory: '',
      medication: '',
      emergencyNotes: ''
    };

    // 保存原始数据用于比较
    const originalEmergencyInfo = JSON.parse(JSON.stringify(emergencyInfo));

    this.setData({
      emergencyInfo,
      originalEmergencyInfo
    });
  },

  // 检查表单是否有变化
  checkFormChanged() {
    const current = this.data.emergencyInfo;
    const original = this.data.originalEmergencyInfo;
    
    // 比较每个字段是否有变化
    const changed = 
      current.bloodType !== original.bloodType ||
      current.allergies !== original.allergies ||
      current.basicDiseases !== original.basicDiseases ||
      current.surgeryHistory !== original.surgeryHistory ||
      current.medication !== original.medication ||
      current.emergencyNotes !== original.emergencyNotes;
    
    this.setData({ formChanged: changed });
  },

  // 血型选择变化
  onBloodTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      'emergencyInfo.bloodType': this.data.bloodTypes[index]
    });
    this.checkFormChanged();
  },

  // 输入框内容变化
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`emergencyInfo.${field}`]: value
    });
    this.checkFormChanged();
  },

  // 提交表单
  onSubmit() {
    const { emergencyInfo } = this.data;
    
    // 获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '保存中...'
    });
    
    // 获取全局配置中的baseUrl
    const app = getApp();
    const baseUrl = app.globalData.baseUrl || 'http://localhost:8081';
    
    // 发送到后端
    wx.request({
      url: `${baseUrl}/api/emergency/update`,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: emergencyInfo,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存到本地缓存
          wx.setStorageSync('emergencyInfo', emergencyInfo);
          
          // 显示保存成功提示
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000
          });

          wx.switchTab({
            url: '/pages/info/info',
          })
          
          // 重置表单变化状态
          this.setData({
            originalEmergencyInfo: JSON.parse(JSON.stringify(emergencyInfo)),
            formChanged: false
          });
        } else {
          wx.showToast({
            title: res.data && res.data.message ? res.data.message : '保存失败',
            icon: 'none'
          });
          console.error('保存紧急医疗信息失败:', res);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        console.error('请求失败:', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
}); 