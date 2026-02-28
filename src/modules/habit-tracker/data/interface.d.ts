declare namespace HabitTracker {
  // 普通习惯接口：用于每日只需完成一次的习惯
  interface Habit {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    createdAt: number;
    startDate: number;
    endDate: number;
    targetDays: number;
  }

  // 普通习惯记录接口：记录每日完成状态
  interface HabitRecord {
    id: string;
    habitId: string;
    date: string;
    completed: boolean;
    notes?: string;
  }

  // 带记录的习惯接口：扩展自Habit，包含完成统计信息
  interface HabitWithRecords extends Habit {
    records: HabitRecord[];
    completedDays: number;
    completionRate: number;
  }

  // 时段习惯接口：用于需要特定时间打卡的习惯（如喝水、运动等）
  interface TimeHabit {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon?: string;
    createdAt: number;
    targetTime: string;
    timeRange?: string;
    reminderEnabled: boolean;
    reminderMinutes: number;
    frequency: "daily" | "weekdays" | "weekends" | "custom" | "interval";
    weekdays?: number[];
    intervalMinutes?: number;
    startDate: number;
    endDate?: number;
  }

  // 时段习惯记录接口：记录打卡时间戳
  interface TimeHabitRecord {
    id: string;
    habitId: string;
    date: string;
    completedAt: number;
    notes?: string;
  }

  // 带记录的时段习惯接口：扩展自TimeHabit，包含完成统计信息
  interface TimeHabitWithRecords extends TimeHabit {
    records: TimeHabitRecord[];
    completedDays: number;
    completionRate: number;
  }

  // 每日统计接口：用于展示每日习惯完成情况
  interface DailyStats {
    date: string;
    totalHabits: number;
    completedHabits: number;
    completionRate: number;
  }

  // 导出数据接口：用于备份和导出习惯数据
  interface ExportData {
    habits: Habit[];
    records: HabitRecord[];
    timeHabits?: TimeHabit[];
    timeHabitRecords?: TimeHabitRecord[];
    exportDate: number;
  }
}
