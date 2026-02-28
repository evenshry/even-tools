import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button, Space, Typography, Tag, message } from "antd";
import { CheckOutlined, CloseOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { dbManager } from "@/modules/habit-tracker/utils/indexedDB";
import { generateId, formatDate } from "@/modules/habit-tracker/utils/dateUtils";
import "@/modules/habit-tracker/components/TimeHabitTimeline.scss";

const { Title, Text } = Typography;

interface TimeHabitTimelineProps {
  habit: HabitTracker.TimeHabitWithRecords;
  onRecordChange: () => void;
}

const TimeHabitTimeline: React.FC<TimeHabitTimelineProps> = ({ habit, onRecordChange }) => {
  const [todayRecords, setTodayRecords] = useState<HabitTracker.TimeHabitRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodayRecords = useCallback(async () => {
    try {
      const today = formatDate(new Date());
      const records = await dbManager.getTimeHabitRecordsByDate(today);
      setTodayRecords(records);
    } catch (error) {
      console.error("加载记录失败:", error);
      message.error("加载记录失败，请重试");
    }
  }, []);

  useEffect(() => {
    loadTodayRecords();
  }, [habit.id, loadTodayRecords]);

  const getTodayRecord = useCallback(() => {
    const today = formatDate(new Date());
    return todayRecords.find((r) => r.habitId === habit.id && r.date === today);
  }, [todayRecords, habit.id]);

  const isHabitActiveToday = useCallback(() => {
    const today = new Date();
    const weekday = today.getDay();
    const startDate = new Date(habit.startDate);
    const endDate = habit.endDate ? new Date(habit.endDate) : null;

    if (today < startDate || (endDate && today > endDate)) {
      return false;
    }

    switch (habit.frequency) {
      case "daily":
        return true;
      case "weekdays":
        return weekday >= 1 && weekday <= 5;
      case "weekends":
        return weekday === 0 || weekday === 6;
      case "custom":
        return habit.weekdays?.includes(weekday) ?? false;
      case "interval":
        return true;
      default:
        return true;
    }
  }, [habit.startDate, habit.endDate, habit.frequency, habit.weekdays]);

  const getTodayStatus = useCallback(() => {
    const record = getTodayRecord();
    const isActive = isHabitActiveToday();

    if (!isActive) {
      return { status: "inactive", text: "今天不是执行日" };
    }

    if (habit.intervalMinutes) {
      const now = dayjs();
      const targetTime = dayjs(habit.targetTime, "HH:mm");
      const startTime = targetTime.hour() * 60 + targetTime.minute();
      const currentTime = now.hour() * 60 + now.minute();
      const intervalMinutes = habit.intervalMinutes;

      if (currentTime < startTime) {
        return { status: "pending", text: `将在 ${habit.targetTime} 开始` };
      }

      const habitTodayRecords = todayRecords.filter((r: HabitTracker.TimeHabitRecord) => r.habitId === habit.id);
      const lastRecord = habitTodayRecords.sort((a: HabitTracker.TimeHabitRecord, b: HabitTracker.TimeHabitRecord) => b.completedAt - a.completedAt)[0];

      if (lastRecord) {
        const lastTime = dayjs(lastRecord.completedAt);
        const minutesSinceLast = now.diff(lastTime, "minute");
        if (minutesSinceLast >= intervalMinutes) {
          return { status: "pending", text: "可以再次打卡" };
        } else {
          const nextTime = lastTime.add(intervalMinutes, "minute");
          const remainingMinutes = nextTime.diff(now, "minute");
          return { status: "completed", text: `下次 ${nextTime.format("HH:mm")} (${remainingMinutes}分钟后)` };
        }
      }

      return { status: "pending", text: `将在 ${habit.targetTime} 开始` };
    }

    if (record) {
      const completedTime = dayjs(record.completedAt).format("HH:mm");
      return { status: "completed", text: `已于 ${completedTime} 完成` };
    }

    const now = dayjs();
    const targetTime = dayjs(habit.targetTime, "HH:mm");

    if (now.isBefore(targetTime)) {
      return { status: "pending", text: `目标时间 ${habit.targetTime}` };
    }

    return { status: "pending", text: "可以随时打卡" };
  }, [getTodayRecord, isHabitActiveToday, habit, todayRecords]);

  const handleCheckIn = useCallback(async () => {
    setLoading(true);
    try {
      const today = formatDate(new Date());

      if (habit.intervalMinutes) {
        const record: HabitTracker.TimeHabitRecord = {
          id: generateId(),
          habitId: habit.id,
          date: today,
          completedAt: Date.now(),
        };
        await dbManager.addTimeHabitRecord(record);
        message.success("打卡成功");
      } else {
        const existingRecord = getTodayRecord();
        if (existingRecord) {
          await dbManager.deleteTimeHabitRecord(existingRecord.id);
          message.success("已取消打卡");
        } else {
          const record: HabitTracker.TimeHabitRecord = {
            id: generateId(),
            habitId: habit.id,
            date: today,
            completedAt: Date.now(),
          };
          await dbManager.addTimeHabitRecord(record);
          message.success("打卡成功");
        }
      }

      await loadTodayRecords();
      onRecordChange();
    } catch (error) {
      console.error("打卡失败:", error);
      message.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [habit, getTodayRecord, loadTodayRecords, onRecordChange]);

  const getActionButton = useCallback(() => {
    const { status } = getTodayStatus();
    const record = getTodayRecord();

    if (status === "inactive") {
      return (
        <Button
          disabled
          className="time-habit-timeline__action-btn"
        >
          今天不是执行日
        </Button>
      );
    }

    if (habit.intervalMinutes) {
      return (
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleCheckIn}
          loading={loading}
          className="time-habit-timeline__action-btn time-habit-timeline__action-btn--check"
          size="large"
        >
          立即打卡
        </Button>
      );
    }

    if (record) {
      return (
        <Button
          type="primary"
          danger
          icon={<CloseOutlined />}
          onClick={handleCheckIn}
          loading={loading}
          className="time-habit-timeline__action-btn time-habit-timeline__action-btn--cancel"
        >
          取消打卡
        </Button>
      );
    }

    return (
      <Button
        type="primary"
        icon={<CheckOutlined />}
        onClick={handleCheckIn}
        loading={loading}
        className="time-habit-timeline__action-btn time-habit-timeline__action-btn--check"
        size="large"
      >
        立即打卡
      </Button>
    );
  }, [getTodayStatus, getTodayRecord, habit.intervalMinutes, handleCheckIn, loading]);

  const { status, text } = getTodayStatus();
  const record = getTodayRecord();

  const statusColor = useMemo(() => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "processing";
      case "inactive":
        return "default";
      default:
        return "default";
    }
  }, [status]);

  return (
    <div className="time-habit-timeline">
      <Card className="time-habit-timeline__card">
        <div className="time-habit-timeline__header">
          <div className="time-habit-timeline__title">
            <ClockCircleOutlined style={{ color: habit.color, fontSize: 20, marginRight: 12 }} />
            <Title level={4} style={{ margin: 0 }}>
              {habit.name}
            </Title>
          </div>
          <div className="time-habit-timeline__status">
            <Tag color={statusColor}>{text}</Tag>
          </div>
        </div>

        {habit.description && (
          <Text type="secondary" className="time-habit-timeline__description">
            {habit.description}
          </Text>
        )}

        <div className="time-habit-timeline__info">
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <div className="time-habit-timeline__info-item">
              <Text type="secondary">目标时间：</Text>
              <Text strong>{habit.targetTime}</Text>
              {habit.timeRange && <Text strong> - {habit.timeRange}</Text>}
            </div>

            <div className="time-habit-timeline__info-item">
              <Text type="secondary">频率：</Text>
              <Text>{getFrequencyText(habit)}</Text>
            </div>

            {habit.reminderEnabled && (
              <div className="time-habit-timeline__info-item">
                <Text type="secondary">提醒：</Text>
                <Text>提前 {habit.reminderMinutes} 分钟</Text>
              </div>
            )}

            {record && (
              <div className="time-habit-timeline__info-item">
                <Text type="secondary">完成时间：</Text>
                <Text strong style={{ color: "#52c41a" }}>
                  {dayjs(record.completedAt).format("YYYY-MM-DD HH:mm")}
                </Text>
              </div>
            )}
          </Space>
        </div>

        <div className="time-habit-timeline__actions">
          {getActionButton()}
        </div>

        <div className="time-habit-timeline__stats">
          <div className="time-habit-timeline__stat-item">
            <Text type="secondary">已完成</Text>
            <Text strong style={{ fontSize: 24, color: habit.color }}>
              {habit.completedDays}
            </Text>
          </div>
          <div className="time-habit-timeline__stat-item">
            <Text type="secondary">完成率</Text>
            <Text strong style={{ fontSize: 24, color: habit.color }}>
              {habit.completionRate.toFixed(1)}%
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

const getFrequencyText = (habit?: HabitTracker.TimeHabit) => {
  if (!habit) return "";
  
  const weekdayMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  switch (habit.frequency) {
    case "daily":
      return "每天";
    case "weekdays":
      return "工作日";
    case "weekends":
      return "周末";
    case "custom":
      return habit.weekdays?.map((d) => weekdayMap[d]).join("、") || "自定义";
    case "interval":
      return `每隔 ${habit.intervalMinutes || 60} 分钟`;
    default:
      return "每天";
  }
};

export default TimeHabitTimeline;
