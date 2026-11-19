import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// 只覆盖曾经会失败的一条路径：数字服务 ID + 变成展示文本的旧缓存 + 七天外的预约。
const timeModule = { exports: {} };
runInNewContext(readFileSync(new URL('../utils/serviceTime.js', import.meta.url), 'utf8'),
  { module: timeModule, Date, String, Number, Error });

let pageDefinition;
let getCount = 0;
let submitted;
const oldCache = [{ serviceId: 42, scheduledTime: '已格式化的旧时间', appointedAddress: '旧缓存地址' }];
const wx = {
  getStorageSync: key => ({ token: 'test-token', userInfo: { id: 7, userType: 0 }, serviceInfo: oldCache })[key],
  removeStorageSync: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  showToast: () => {},
  switchTab: () => {},
  request: args => {
    if (args.method === 'GET') {
      getCount++;
      args.success({ statusCode: 200, data: {
        serviceId: 42, targetId: 7, targetName: '老人', serviceType: 0,
        serviceStatus: 0, scheduledTime: '2099-01-02T00:30:00Z',
        appointedAddress: '服务端当前地址', serviceDes: '旧备注'
      } });
    } else {
      submitted = args.data;
      args.success({ statusCode: 200, data: { success: true } });
    }
    args.complete?.();
  }
};
runInNewContext(readFileSync(new URL('../pages/service_create/service_create.js', import.meta.url), 'utf8'), {
  getApp: () => ({ globalData: { baseUrl: 'https://example.invalid' } }),
  require: () => timeModule.exports,
  Page: definition => { pageDefinition = definition; },
  wx, Date, String, Number, Boolean, JSON, parseInt, console,
  setTimeout: () => {}
});

const page = {
  ...pageDefinition,
  data: structuredClone(pageDefinition.data),
  setData(changes) {
    for (const [path, value] of Object.entries(changes)) {
      const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      let target = this.data;
      for (const part of parts.slice(0, -1)) target = target[part];
      target[parts.at(-1)] = value;
    }
  }
};

page.onLoad({ id: '42' });
assert.equal(getCount, 1, '编辑页只应请求一次服务端详情');
assert.equal(page.data.formData.address, '服务端当前地址');
assert.equal(page.data.formData.isoScheduledTime, '2099-01-02T00:30:00Z');
assert.equal(page.data.formData.scheduledTime, '2099-01-02 08:30');
assert.equal(page.data.formData.targetIndex, 0, '字符串 ID 与数字 ID 应匹配');
assert.equal(page.data.formData.timeIndex[0], -1, '历史预约可不在七天选择范围内');
page.onInput({ currentTarget: { dataset: { field: 'remark' } }, detail: { value: '新备注' } });
assert.equal(page.data.hasFormChanged, true);
page.onSubmit();
assert.equal(submitted.scheduledTime, '2099-01-02T00:30:00Z', '仅修改备注不应改变原预约时间');
assert.equal(submitted.remark, '新备注');
console.log('Service edit server-authoritative data check passed');
