import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// 小程序使用 CommonJS；用独立上下文读取纯时间函数，不依赖微信运行时。
const moduleRef = { exports: {} };
runInNewContext(readFileSync(new URL('../utils/serviceTime.js', import.meta.url), 'utf8'),
  { module: moduleRef, Date, String, Number, Error });
const { beijingCalendarDay, beijingWallTimeToIso, formatBeijingTime } = moduleRef.exports;

for (const zone of ['UTC', 'Asia/Shanghai', 'America/Los_Angeles']) {
  process.env.TZ = zone;
  assert.equal(beijingWallTimeToIso('2030-01-02T08:30:00'), '2030-01-02T00:30:00.000Z');
  assert.equal(beijingWallTimeToIso('2027-01-01T00:30:00'), '2026-12-31T16:30:00.000Z');
  assert.equal(formatBeijingTime('2030-01-02T00:30:00Z', true), '2030-01-02 08:30');
  assert.deepEqual({ ...beijingCalendarDay(0, Date.parse('2026-12-31T23:30:00Z')) },
    { year: 2027, month: 1, date: 1 });
  assert.throws(() => beijingWallTimeToIso('2030-02-30T08:30:00'));
}
console.log('Beijing service time checks passed across three device time zones');
