/**
 * 日期工具函数模块
 * 提供日期格式化、计算、比较等常用功能
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式（使用本地时区，避免 UTC 跨天）
 * @param date - 要格式化的日期对象
 * @returns 格式化后的日期字符串，例如 "2024-01-15"
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * 获取两个日期之间的所有日期（包含起止日期）
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 日期数组，包含从开始日期到结束日期的所有日期
 */
export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const lastDate = new Date(endDate);
  lastDate.setHours(0, 0, 0, 0);

  while (currentDate <= lastDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

/**
 * 生成习惯的追踪区间
 * 从开始日期起至少覆盖目标天数，并延伸到今天或结束日期中较晚的一天，
 * 这样目标天数大于 30 或习惯已持续较久时也不会被截断。
 * @param startDate - 开始日期时间戳
 * @param targetDays - 目标天数
 * @param endDate - 可选的结束日期时间戳
 */
export const getTrackingRange = (startDate: number, targetDays: number, endDate?: number): Date[] => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetEnd = new Date(start);
  targetEnd.setDate(targetEnd.getDate() + Math.max(1, targetDays) - 1);

  const endTimestamp = Math.max(
    targetEnd.getTime(),
    today.getTime(),
    endDate ?? 0
  );

  return getDateRange(start, new Date(endTimestamp));
};

/**
 * 计算习惯完成率
 * @param records - 习惯记录数组
 * @param totalDays - 总天数
 * @returns 完成率（百分比，0-100）
 */
export const calculateCompletionRate = (records: HabitTracker.HabitRecord[], totalDays: number): number => {
  if (totalDays <= 0) {
    return 0;
  }
  const completedDays = records.filter((r) => r.completed).length;
  return Math.min(100, Math.max(0, (completedDays / totalDays) * 100));
};

/**
 * 生成唯一ID
 * @returns 唯一标识符字符串，格式为 "时间戳-随机字符串"
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * 获取随机颜色
 * @returns 随机选择的颜色字符串（十六进制格式）
 */
export const getRandomColor = (): string => {
  const colors = [
    "#1890ff",
    "#52c41a",
    "#faad14",
    "#f5222d",
    "#722ed1",
    "#eb2f96",
    "#13c2c2",
    "#fa8c16",
    "#a0d911",
    "#2f54eb",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * 判断日期是否为今天
 * @param date - 要判断的日期
 * @returns 如果是今天返回 true，否则返回 false
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * 判断日期是否为过去的日期
 * @param date - 要判断的日期
 * @returns 如果是过去日期返回 true，否则返回 false
 */
export const isPast = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * 判断日期是否为未来的日期
 * @param date - 要判断的日期
 * @returns 如果是未来日期返回 true，否则返回 false
 */
export const isFuture = (date: Date): boolean => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};
