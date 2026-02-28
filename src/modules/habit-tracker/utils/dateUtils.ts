/**
 * 日期工具函数模块
 * 提供日期格式化、计算、比较等常用功能
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式
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
export const getDaysBetween = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * 获取从指定日期开始的30天日期范围
 * @param startDate - 开始日期
 * @returns 包含30个日期的数组
 */
export const get30DayRange = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < 30; i++) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * 计算习惯完成率
 * @param records - 习惯记录数组
 * @param totalDays - 总天数
 * @returns 完成率（百分比，0-100）
 */
export const calculateCompletionRate = (records: HabitTracker.HabitRecord[], totalDays: number): number => {
  const completedDays = records.filter((r) => r.completed).length;
  return totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
};

/**
 * 获取包含记录的习惯对象
 * @param habit - 习惯对象
 * @param records - 所有记录数组
 * @returns 包含记录、完成天数和完成率的习惯对象
 */
export const getHabitWithRecords = async (habit: HabitTracker.Habit, records: HabitTracker.HabitRecord[]): Promise<HabitTracker.HabitWithRecords> => {
  const habitRecords = records.filter((r) => r.habitId === habit.id);
  const completedDays = habitRecords.filter((r) => r.completed).length;
  const completionRate = calculateCompletionRate(habitRecords, habit.targetDays);

  return {
    ...habit,
    records: habitRecords,
    completedDays,
    completionRate,
  };
};

/**
 * 获取每日统计数据
 * @param habits - 习惯数组
 * @param records - 记录数组
 * @param dateRange - 日期范围
 * @returns 每日统计数据数组，包含日期、总习惯数、完成习惯数和完成率
 */
export const getDailyStats = (habits: HabitTracker.Habit[], records: HabitTracker.HabitRecord[], dateRange: Date[]): HabitTracker.DailyStats[] => {
  return dateRange.map((date) => {
    const dateStr = formatDate(date);
    const activeHabits = habits.filter((h) => {
      const startDate = new Date(h.startDate);
      const endDate = new Date(h.endDate);
      return date >= startDate && date <= endDate;
    });

    const dayRecords = records.filter((r) => r.date === dateStr);
    const completedHabits = dayRecords.filter((r) => r.completed).length;
    const completionRate = activeHabits.length > 0 ? (completedHabits / activeHabits.length) * 100 : 0;

    return {
      date: dateStr,
      totalHabits: activeHabits.length,
      completedHabits,
      completionRate,
    };
  });
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
