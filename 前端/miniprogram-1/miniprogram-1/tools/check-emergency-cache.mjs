import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const stored = new Map();
const requests = [];
const toasts = [];
const wx = {
  getStorageSync: key => stored.get(key),
  setStorageSync: (key, value) => stored.set(key, value),
  removeStorageSync: key => stored.delete(key),
  request: args => requests.push(args),
  showToast: args => toasts.push(args.title),
  showLoading: () => {}, hideLoading: () => {},
  stopPullDownRefresh: () => {}, switchTab: () => {}
};

const cacheModule = { exports: {} };
runInNewContext(readFileSync(new URL('../utils/emergencyCache.js', import.meta.url), 'utf8'),
  { module: cacheModule, wx, Number, String, Array });
const cache = cacheModule.exports;

function makePage(name) {
  let definition;
  runInNewContext(readFileSync(new URL(`../pages/${name}/${name}.js`, import.meta.url), 'utf8'), {
    require: path => path.includes('emergencyCache') ? cache : { baseUrl: 'https://test.invalid', apis: {} },
    Page: value => { definition = value; },
    getApp: () => ({ globalData: { baseUrl: 'https://test.invalid' } }),
    wx, console: { error: () => {} }, JSON, Number, String
  });
  return {
    ...definition,
    data: structuredClone(definition.data),
    setData(changes) { Object.assign(this.data, changes); }
  };
}

const login = makePage('login');
stored.set('emergencyInfo', { allergies: '旧版无归属的病史' });
login.storeUserData('token-A', { id: 7, userType: 0 },
  [{ bloodType: 'A型', allergies: '花生' }], [{ bind_status: 1, phone: '13800000000' }]);
assert.equal(cache.readEmergencyInfo().allergies, '花生', '登录数组应存为单条医疗记录');
assert.equal(stored.has('emergencyInfo'), false, '无归属旧缓存应清理');

const card = makePage('emergency_info');
card.onShow();
assert.equal(card.data.emergencyInfo.allergies, '花生', '同账号离线应立即可读');
assert.equal(card.data.emergencyContact.phone, '13800000000');
const aRequest = requests.at(-1);

const editor = makePage('emergency');
editor.onLoad();
const aEditorRequest = requests.at(-1);

login.storeUserData('token-B', { id: 8, userType: 0 }, [{ bloodType: 'O型' }], []);
card.onShow();
assert.equal(card.data.emergencyInfo.bloodType, 'O型');
assert.equal(card.data.emergencyContact.phone, undefined, '不得显示上个账号的联系人');
const bRequest = requests.at(-1);

aRequest.success({ statusCode: 200, data: { emergencyInfo: { allergies: 'A迟到响应' } } });
aEditorRequest.success({ statusCode: 200, data: { emergencyInfo: { allergies: 'A编辑页迟到响应' } } });
assert.equal(cache.readEmergencyInfo().bloodType, 'O型', '旧账号的迟到响应不能覆盖新账号缓存');

bRequest.fail(new Error('offline'));
assert.equal(card.data.emergencyInfo.bloodType, 'O型', '断网时保留当前账号急救卡');

editor.onSubmit();
assert.equal(toasts.at(-1), '登录账号已变化，请重新进入页面', '旧账号编辑页不能用新账号令牌提交');

editor.onShow();
const bEditorRequest = requests.at(-1);
bEditorRequest.fail(new Error('offline'));
assert.equal(editor.data.emergencyInfo.bloodType, 'O型', '编辑页断网时加载当前账号副本');

const binds = makePage('bind_list');
binds.onShow();
const bBindRequest = requests.at(-1);
login.storeUserData('token-C', { id: 9, userType: 0 }, [], []);
bBindRequest.success({ statusCode: 200, data: { data: [{ phone: '被延迟写入的B联系人' }] } });
assert.equal(stored.get('bindInfoOwnerId'), '9');
assert.equal(stored.get('bindInfo').length, 0, '迟到的绑定列表不能污染新账号');

console.log('Emergency offline cache, account switching, and stale-response checks passed');
