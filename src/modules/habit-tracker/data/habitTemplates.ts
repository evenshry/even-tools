export interface HabitTemplate {
  name: string;
  description: string;
  targetTime: string;
  timeRange?: string;
  frequency: string;
  weekdays?: number[];
  intervalMinutes?: number;
  reminderEnabled: boolean;
  reminderMinutes: number;
}

export const habitTemplates: HabitTemplate[] = [
  {
    name: "喝水",
    description: "每天定时喝水，保持身体健康",
    targetTime: "09:00",
    frequency: "daily",
    intervalMinutes: 60,
    reminderEnabled: true,
    reminderMinutes: 5,
  },
  {
    name: "运动",
    description: "下班后运动，保持身材和健康",
    targetTime: "18:00",
    timeRange: "19:00",
    frequency: "weekdays",
    weekdays: [1, 2, 3, 4, 5],
    reminderEnabled: true,
    reminderMinutes: 10,
  },
  {
    name: "学习",
    description: "每天固定时间学习新知识",
    targetTime: "20:00",
    frequency: "daily",
    reminderEnabled: true,
    reminderMinutes: 5,
  },
  {
    name: "休息",
    description: "工作间隙休息，放松身心",
    targetTime: "10:00",
    frequency: "weekdays",
    weekdays: [1, 2, 3, 4, 5],
    intervalMinutes: 120,
    reminderEnabled: true,
    reminderMinutes: 2,
  },
  {
    name: "眼保健操",
    description: "保护眼睛，缓解视疲劳",
    targetTime: "14:00",
    frequency: "weekdays",
    weekdays: [1, 2, 3, 4, 5],
    reminderEnabled: true,
    reminderMinutes: 5,
  },
  {
    name: "冥想",
    description: "每天冥想，保持内心平静",
    targetTime: "07:00",
    frequency: "daily",
    reminderEnabled: true,
    reminderMinutes: 5,
  },
];
