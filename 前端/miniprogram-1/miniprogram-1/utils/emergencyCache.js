// 急救资料需要离线可读，但不能从无归属的旧缓存推断其所属账号。
const CACHE_KEY = 'emergencyInfoAccountCache';

function currentSession() {
  const token = wx.getStorageSync('token');
  const userInfo = wx.getStorageSync('userInfo');
  if (!token || !userInfo || !Number.isInteger(Number(userInfo.id)) || Number(userInfo.id) <= 0) {
    return null;
  }
  return { token, userId: String(userInfo.id) };
}

function isCurrentSession(session) {
  const current = currentSession();
  return !!(session && current && session.token === current.token && session.userId === current.userId);
}

function readEmergencyInfo() {
  const session = currentSession();
  if (!session) return {};
  const cache = wx.getStorageSync(CACHE_KEY);
  if (!cache || cache.userId !== session.userId || !isEmergencyInfo(cache.info)) return {};
  return cache.info;
}

function isEmergencyInfo(info) {
  return !!(info && typeof info === 'object' && !Array.isArray(info));
}

function saveEmergencyInfo(info, session = currentSession()) {
  if (!isCurrentSession(session) || !isEmergencyInfo(info)) return false;
  wx.setStorageSync(CACHE_KEY, { userId: session.userId, info });
  return true;
}

module.exports = { currentSession, isCurrentSession, readEmergencyInfo, saveEmergencyInfo };
