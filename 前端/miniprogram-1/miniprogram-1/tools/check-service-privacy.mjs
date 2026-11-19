import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const timeModule = { exports: {} };
runInNewContext(readFileSync(new URL('../utils/serviceTime.js', import.meta.url), 'utf8'),
  { module: timeModule, Date, String, Number, Error });

let token = 'account-A';
let latestNavigation;
const requests = [];
const wx = {
  getStorageSync: key => {
    if (key === 'serviceInfo') throw new Error('完整订单不应从持久缓存读取');
    return key === 'token' ? token : { id: 7, userType: 0 };
  },
  setStorageSync: key => { if (key === 'serviceInfo') throw new Error('不可持久缓存订单住址'); },
  showLoading: () => {}, hideLoading: () => {}, showToast: () => {},
  navigateTo: args => { latestNavigation = args.url; },
  request: args => { requests.push(args); }
};

function loadPage(file) {
  let definition;
  runInNewContext(readFileSync(new URL(`../pages/${file}/${file}.js`, import.meta.url), 'utf8'), {
    getApp: () => ({ globalData: { baseUrl: 'https://example.invalid' } }),
    require: () => timeModule.exports,
    Page: value => { definition = value; },
    wx, Date, String, Number, JSON, parseInt, console,
    setTimeout: () => {}
  });
  return {
    ...definition,
    data: structuredClone(definition.data),
    setData(changes) { Object.assign(this.data, changes); }
  };
}

const list = loadPage('service_list');
list.navigateToDetail({ currentTarget: { dataset: { id: 42 } } });
assert.equal(latestNavigation, '/pages/service_detail/service_detail?id=42');

const detail = loadPage('service_detail');
detail.onLoad({ id: '42' });
detail.onShow();
assert.equal(requests.length, 1);
// A 账号的请求未返回就切换到 B 账号，新的请求必须使旧响应失效。
token = 'account-B';
detail.onShow();
assert.equal(requests.length, 2);
requests[0].success({ statusCode: 200, data: {
  serviceId: 42, serviceStatus: 0, serviceType: 1, appointedAddress: 'A账号住址'
} });
assert.equal(detail.data.serviceData.address, undefined, '迟到的旧账号响应不能恢复隐私信息');
requests[1].success({ statusCode: 403, data: { message: '无权访问' } });
assert.equal(detail.data.serviceData.address, undefined);

const evaluation = loadPage('service_evaluate');
evaluation.onLoad({ id: '42' });
evaluation.onShow();
assert.equal(requests.length, 3);
requests[2].success({ statusCode: 200, data: {
  serviceId: 42, targetId: 7, serviceStatus: 3, appointedAddress: '无权评价时不显示'
} });
assert.equal(evaluation.data.serviceData, null, '未到待评价状态时不能展示订单');
console.log('Service private-data and stale-response checks passed');
