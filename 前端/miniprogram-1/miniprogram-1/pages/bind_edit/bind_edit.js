// pages/bind_edit/bind_edit.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    phone: '',  // 对方手机号
    relation: '', // 与对方关系
    relationTypes: ['父子女关系', '母女子关系', '夫妻', '兄弟姐妹', '朋友', '医患关系', '其他关系'], // 关系类型选项
    relationIndex: -1, // 选择的关系索引
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 如果有传入的参数，可以在这里处理
  },

  /**
   * 处理手机号输入
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  /**
   * 处理关系选择
   */
  onRelationChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      relationIndex: index,
      relation: this.data.relationTypes[index]
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { phone, relation } = this.data;

    if (!phone) {
      return {
        valid: false,
        message: '请输入对方手机号'
      };
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        valid: false,
        message: '手机号格式不正确'
      };
    }

    if (!relation) {
      return {
        valid: false,
        message: '请选择与对方的关系'
      };
    }

    return {
      valid: true
    };
  },

  /**
   * 处理提交按钮点击
   */
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
      title: '确认绑定申请',
      content: '确定要向该手机号发送绑定申请吗？',
      success: (res) => {
        if (res.confirm) {
          this.submitBindRequest();
        }
      }
    });
  },

  /**
   * 提交绑定请求
   */
  submitBindRequest() {
    const { phone, relation, relationIndex } = this.data;
    const token = wx.getStorageSync('token');

    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...'
    });

    // 发送绑定请求到服务器
    wx.request({
      url: `${app.globalData.baseUrl}/api/bindings/create`,
      method: 'POST',
      data: {
        target_phone: phone,
      },
      header: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          wx.showToast({
            title: '绑定申请已发送',
            icon: 'success',
            duration: 2000
          });
          
          // 延迟返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        } else {
          wx.showToast({
            title: res.data.message || '绑定申请失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('绑定申请失败:', err);
        wx.showToast({
          title: '网络请求失败，请检查网络',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  /**
   * 返回列表
   */
  handleBack() {
    wx.navigateBack();
  }
}); 