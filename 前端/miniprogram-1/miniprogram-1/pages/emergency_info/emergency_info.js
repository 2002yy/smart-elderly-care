// pages/emergency_info/emergency_info.js
const emergencyCache = require('../../utils/emergencyCache.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    bindInfo: [],
    emergencyContact: {},
    emergencyInfo: {},
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {},

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载数据，确保数据最新
    this.loadAllInfo();
    this.fetchEmergencyInfo();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadAllInfo();
    this.fetchEmergencyInfo();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 从缓存加载所有信息
   */
  loadAllInfo() {
    const session = emergencyCache.currentSession();
    // 加载用户信息
    const userInfo = session ? (wx.getStorageSync('userInfo') || {}) : {};
    
    // 联系人缓存也必须属于当前账号，不能被切换前的列表请求污染。
    const bindOwnerId = wx.getStorageSync('bindInfoOwnerId');
    const bindInfo = session && bindOwnerId === session.userId
      ? (wx.getStorageSync('bindInfo') || []) : [];
    
    // 找到已激活的绑定对象作为紧急联系人
    const activeBind = bindInfo.find(bind => bind.bind_status === 1);
    
    // 加载紧急医疗信息
    const emergencyInfo = emergencyCache.readEmergencyInfo();

    // 更新数据
    this.setData({
      userInfo,
      bindInfo,
      emergencyContact: activeBind || {},
      emergencyInfo
    });

    // 检查是否有紧急医疗信息
    if (!emergencyInfo.bloodType && 
        !emergencyInfo.allergies && 
        !emergencyInfo.basicDiseases && 
        !emergencyInfo.surgeryHistory && 
        !emergencyInfo.medication && 
        !emergencyInfo.emergencyNotes) {
      // 如果没有紧急医疗信息，提示用户填写
      wx.showToast({
        title: '请完善急救信息',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 从后端获取紧急医疗信息
   */
  fetchEmergencyInfo() {
    this.setData({ loading: true });
    
    // 获取token
    const session = emergencyCache.currentSession();
    if (!session) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      this.setData({ loading: false });
      return;
    }
    const token = session.token;
    
    // 获取全局配置中的baseUrl
    const app = getApp();
    const baseUrl = app.globalData.baseUrl;
    
    wx.request({
      url: `${baseUrl}/api/emergency/info`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (!emergencyCache.isCurrentSession(session)) return;
        if (res.statusCode === 200 && res.data && res.data.emergencyInfo) {
          // 从后端获取数据成功
          const emergencyInfo = res.data.emergencyInfo;
          
          // 保存到本地缓存
          emergencyCache.saveEmergencyInfo(emergencyInfo, session);
          
          this.setData({
            emergencyInfo
          });
        } else {
          // 明确的鉴权失败不允许继续展示之前缓存的医疗记录。
          if (res.statusCode === 401 || res.statusCode === 403) {
            this.setData({ emergencyInfo: {} });
          }
          console.error('获取紧急医疗信息失败:', res);
        }
      },
      fail: (err) => {
        if (!emergencyCache.isCurrentSession(session)) return;
        console.error('请求紧急医疗信息失败:', err);
      },
      complete: () => {
        if (emergencyCache.isCurrentSession(session)) this.setData({ loading: false });
      }
    });
  },

  /**
   * 尚无实际通知渠道；只提供直接拨号，不谎称已经发送求助。
   * 拨号无需登录、网络或定位授权，也不受医疗信息加载状态影响。
   */
  callEmergencyServices() {
    wx.makePhoneCall({
      phoneNumber: '120',
      fail: () => {
        wx.showToast({ title: '无法发起拨号，请使用手机电话拨打', icon: 'none' });
      }
    });
  },

  callEmergencyContact() {
    const contact = this.data.emergencyContact;
    const phoneNumber = contact && contact.phone;
    if (!phoneNumber) {
      wx.showToast({ title: '尚未设置监护人电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({
      phoneNumber: String(phoneNumber),
      fail: () => {
        wx.showToast({ title: '无法发起拨号，请使用手机电话拨打', icon: 'none' });
      }
    });
  }
})
