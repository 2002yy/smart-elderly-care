// 服务约定使用北京时间 (UTC+08:00)，计算不得依赖用户设备所在地的时区。
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const two = value => String(value).padStart(2, '0');

function beijingCalendarDay(offsetDays = 0, now = Date.now()) {
  const day = new Date(now + BEIJING_OFFSET_MS + offsetDays * DAY_MS);
  return {
    year: day.getUTCFullYear(),
    month: day.getUTCMonth() + 1,
    date: day.getUTCDate()
  };
}

function beijingClock(now = Date.now()) {
  const time = new Date(now + BEIJING_OFFSET_MS);
  return { hour: time.getUTCHours(), minute: time.getUTCMinutes() };
}

function beijingWallTimeToIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('无效的预约时间格式');
  const [year, month, date, hour, minute, second] = match.slice(1).map(Number);
  const wallClock = new Date(Date.UTC(year, month - 1, date, hour, minute, second));
  if (wallClock.getUTCFullYear() !== year || wallClock.getUTCMonth() !== month - 1
      || wallClock.getUTCDate() !== date || wallClock.getUTCHours() !== hour
      || wallClock.getUTCMinutes() !== minute || wallClock.getUTCSeconds() !== second) {
    throw new Error('不存在的预约时间');
  }
  return new Date(wallClock.getTime() - BEIJING_OFFSET_MS).toISOString();
}

function formatBeijingTime(iso, showYear = false) {
  if (!iso) return '';
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) return '';
  const day = new Date(utc.getTime() + BEIJING_OFFSET_MS);
  const year = showYear ? day.getUTCFullYear() + '-' : '';
  return `${year}${two(day.getUTCMonth() + 1)}-${two(day.getUTCDate())} `
    + `${two(day.getUTCHours())}:${two(day.getUTCMinutes())}`;
}

module.exports = { beijingCalendarDay, beijingClock, beijingWallTimeToIso, formatBeijingTime };
