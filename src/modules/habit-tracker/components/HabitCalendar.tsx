import React, { useCallback, useMemo } from "react";
import { Card, Typography, Tooltip, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { formatDate, get30DayRange, isToday, isPast, isFuture } from "@/modules/habit-tracker/utils/dateUtils";
import "@/modules/habit-tracker/components/HabitCalendar.scss";

const { Title, Text } = Typography;

interface HabitCalendarProps {
  habit: HabitTracker.HabitWithRecords | null;
  onToggleRecord: (date: Date) => void;
}

const HabitCalendar: React.FC<HabitCalendarProps> = ({ habit, onToggleRecord }) => {
  const handleDayClick = useCallback((date: Date) => {
    onToggleRecord(date);
  }, [onToggleRecord]);

  const getDayStatus = useCallback((date: Date): "completed" | "missed" | "future" | "today" | "past" => {
    if (!habit) return "past";
    
    const dateStr = formatDate(date);
    const record = habit.records.find((r) => r.date === dateStr);

    if (isToday(date)) {
      return record?.completed ? "completed" : "today";
    }
    if (isFuture(date)) {
      return "future";
    }
    if (record?.completed) {
      return "completed";
    }
    if (isPast(date)) {
      return "missed";
    }
    return "past";
  }, [habit]);

  const getDayIcon = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleOutlined />;
      case "missed":
        return <CloseCircleOutlined />;
      case "today":
        return <ClockCircleOutlined />;
      default:
        return null;
    }
  }, []);

  const getDayTooltip = useCallback((date: Date, status: string): string => {
    const dateStr = formatDate(date);

    if (status === "completed") {
      return `${dateStr} - 已完成`;
    }
    if (status === "missed") {
      return `${dateStr} - 未完成`;
    }
    if (status === "today") {
      return `${dateStr} - 今天`;
    }
    if (status === "future") {
      return `${dateStr} - 未来`;
    }
    return dateStr;
  }, []);

  const getActionButton = useCallback((date: Date, status: string) => {
    if (isFuture(date)) {
      return null;
    }

    if (status === "completed" && isToday(date)) {
      return (
        <Button
          type="primary"
          danger
          size="small"
          icon={<CloseOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleDayClick(date);
          }}
          className="habit-calendar__action-btn habit-calendar__action-btn--cancel"
        >
          取消
        </Button>
      );
    }

    if (status === "completed") {
      return (
        <Button
          type="default"
          size="small"
          disabled
          className="habit-calendar__action-btn habit-calendar__action-btn--disabled"
        >
          已完成
        </Button>
      );
    }

    return (
      <Button
        type="primary"
        size="small"
        icon={<CheckOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          handleDayClick(date);
        }}
        className="habit-calendar__action-btn habit-calendar__action-btn--check"
      >
        打卡
      </Button>
    );
  }, [handleDayClick]);

  const calendarData = useMemo(() => {
    if (!habit) return null;

    const dateRange = get30DayRange(new Date(habit.startDate));
    const completedDays = habit.records.filter((r) => r.completed).length;
    const progress = (completedDays / habit.targetDays) * 100;

    return {
      dateRange,
      completedDays,
      progress,
    };
  }, [habit]);

  if (!habit) {
    return (
      <div className="habit-calendar habit-calendar--empty">
        <Card className="habit-calendar__card">
          <div className="habit-calendar__empty-state">
            <Text type="secondary">请从左侧选择一个习惯查看追踪记录</Text>
          </div>
        </Card>
      </div>
    );
  }

  const { dateRange, completedDays, progress } = calendarData!;

  return (
    <div className="habit-calendar">
      <Card className="habit-calendar__card">
        <div className="habit-calendar__header">
          <Title level={3}>{habit.name}</Title>
          <div className="habit-calendar__progress">
            <Text strong>
              {completedDays} / {habit.targetDays} 天
            </Text>
            <Text type="secondary">({progress.toFixed(1)}%)</Text>
          </div>
        </div>

        {habit.description && (
          <Text type="secondary" className="habit-calendar__description">
            {habit.description}
          </Text>
        )}

        <div className="habit-calendar__grid">
          {dateRange.map((date, index) => {
            const status = getDayStatus(date);
            const dateStr = formatDate(date);
            const dayNumber = index + 1;

            return (
              <Tooltip key={dateStr} title={getDayTooltip(date, status)}>
                <div className={`habit-calendar__day habit-calendar__day--${status}`}>
                  <div className="habit-calendar__day-number">{dayNumber}</div>
                  <div className="habit-calendar__day-date">
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                  <div className="habit-calendar__day-icon">{getDayIcon(status)}</div>
                  <div className="habit-calendar__day-action">
                    {getActionButton(date, status)}
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>

        <div className="habit-calendar__legend">
          <div className="habit-calendar__legend-item">
            <CheckCircleOutlined className="habit-calendar__legend-icon habit-calendar__legend-icon--completed" />
            <Text>已完成</Text>
          </div>
          <div className="habit-calendar__legend-item">
            <CloseCircleOutlined className="habit-calendar__legend-icon habit-calendar__legend-icon--missed" />
            <Text>未完成</Text>
          </div>
          <div className="habit-calendar__legend-item">
            <ClockCircleOutlined className="habit-calendar__legend-icon habit-calendar__legend-icon--today" />
            <Text>今天</Text>
          </div>
          <div className="habit-calendar__legend-item">
            <div className="habit-calendar__legend-icon habit-calendar__legend-icon--future" />
            <Text>未来</Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HabitCalendar;
