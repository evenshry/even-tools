import React from "react";
import { Card, Typography, Empty } from "antd";
import { Line, Column } from "@ant-design/charts";
import { get30DayRange, formatDate } from "@/modules/habit-tracker/utils/dateUtils";
import dayjs from "dayjs";
import "@/modules/habit-tracker/components/TimeHabitCharts.scss";

const { Title } = Typography;

interface TimeHabitChartsProps {
  habit: HabitTracker.TimeHabitWithRecords | null;
  records: HabitTracker.TimeHabitRecord[];
}

const TimeHabitCharts: React.FC<TimeHabitChartsProps> = ({ habit, records }) => {
  // 空状态处理：未选择习惯时显示提示
  if (!habit) {
    return (
      <div className="time-habit-charts time-habit-charts--empty">
        <Card className="time-habit-charts__card">
          <Empty description="请选择一个习惯查看图表" />
        </Card>
      </div>
    );
  }

  // 获取30天日期范围并筛选当前习惯的记录
  const dateRange = get30DayRange(new Date(habit.startDate));
  const habitRecords = records.filter((r) => r.habitId === habit.id);

  // 处理有间隔时间的习惯（如每天多次打卡）
  if (habit.intervalMinutes) {
    // 生成每日打卡次数数据
    const dailyCheckInData = dateRange.map((date) => {
      const dateStr = formatDate(date);
      const dayRecords = habitRecords.filter((r) => r.date === dateStr);
      const checkInCount = dayRecords.length;
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        value: checkInCount,
      };
    });

    // 每日打卡次数折线图配置
    const dailyConfig = {
      data: dailyCheckInData,
      xField: "date",
      yField: "value",
      smooth: true,
      point: {
        size: 5,
        shape: "circle",
      },
      yAxis: {
        min: 0,
        title: {
          text: "打卡次数",
        },
      },
      color: habit.color,
      tooltip: {
        formatter: (datum: { date: string; value: number }) => {
          return {
            name: datum.date,
            value: `${datum.value} 次`,
          };
        },
      },
    };

    // 生成今日打卡时间分布数据
    const today = new Date();
    const todayStr = formatDate(today);
    const todayRecords = habitRecords.filter((r) => r.date === todayStr);
    const timeDistributionData = todayRecords
      .map((record) => {
        const time = dayjs(record.completedAt);
        return {
          time: time.format("HH:mm"),
          value: 1,
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    const timeConfig = {
      data: timeDistributionData,
      xField: "time",
      yField: "value",
      smooth: true,
      point: {
        size: 5,
        shape: "circle",
      },
      yAxis: {
        min: 0,
        max: 1,
        tickCount: 2,
        label: {
          formatter: (v: number) => (v === 1 ? "打卡" : ""),
        },
      },
      color: habit.color,
      tooltip: {
        formatter: (datum: { time: string; value: number }) => {
          return {
            name: datum.time,
            value: "打卡",
          };
        },
      },
    };

    // 生成每周打卡统计数据
    const weeklyData = [];
    for (let i = 0; i < dateRange.length; i += 7) {
      const weekDates = dateRange.slice(i, i + 7);
      const weekLabel = `第${Math.floor(i / 7) + 1}周`;
      const totalCheckIns = weekDates.reduce((sum, date) => {
        const dateStr = formatDate(date);
        return sum + habitRecords.filter((r) => r.date === dateStr).length;
      }, 0);
      weeklyData.push({
        week: weekLabel,
        value: totalCheckIns,
      });
    }

    const weeklyConfig = {
      data: weeklyData,
      xField: "week",
      yField: "value",
      label: {
        position: "top",
        formatter: (v: { value: number }) => `${v.value || 0} 次`,
      },
      color: habit.color,
      yAxis: {
        min: 0,
        title: {
          text: "打卡次数",
        },
      },
      tooltip: {
        formatter: (datum: { week: string; value: number }) => {
          return {
            name: datum.week,
            value: `${datum.value || 0} 次`,
          };
        },
      },
    };

    return (
      <div className="time-habit-charts">
        <Card className="time-habit-charts__card">
          <div className="time-habit-charts__header">
            <Title level={3}>{habit.name} - 打卡统计</Title>
          </div>

          <div className="time-habit-charts__content">
            {timeDistributionData.length > 0 && (
              <div className="time-habit-charts__section">
                <Title level={4}>今日打卡时间分布</Title>
                <Line {...timeConfig} height={200} />
              </div>
            )}

            <div className="time-habit-charts__section">
              <Title level={4}>每日打卡次数</Title>
              <Line {...dailyConfig} height={200} />
            </div>

            <div className="time-habit-charts__section">
              <Title level={4}>每周打卡统计</Title>
              <Column {...weeklyConfig} height={200} />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 处理无间隔时间的习惯（每天只需完成一次）
  // 生成每日完成状态数据
  const completionData = dateRange.map((date) => {
    const dateStr = formatDate(date);
    const hasRecord = habitRecords.some((r) => r.date === dateStr);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      value: hasRecord ? 1 : 0,
      type: "完成状态",
    };
  });

  const completionConfig = {
    data: completionData,
    xField: "date",
    yField: "value",
    seriesField: "type",
    smooth: true,
    point: {
      size: 5,
      shape: "circle",
    },
    yAxis: {
      min: 0,
      max: 1,
      tickCount: 2,
      label: {
        formatter: (v: number) => (v === 1 ? "完成" : "未完成"),
      },
    },
    color: habit.color,
    tooltip: {
      formatter: (datum: { date: string; value: number }) => {
        return {
          name: datum.date,
          value: datum.value === 1 ? "已完成" : "未完成",
        };
      },
    },
  };

  // 生成累计完成天数数据
  const cumulativeData = dateRange.map((date) => {
    const completedCount = habitRecords.filter((r) => new Date(r.date) <= date).length;
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      value: completedCount,
      type: "累计完成",
    };
  });

  const cumulativeConfig = {
    data: cumulativeData,
    xField: "date",
    yField: "value",
    seriesField: "type",
    smooth: true,
    point: {
      size: 5,
      shape: "circle",
    },
    yAxis: {
      min: 0,
      title: {
        text: "累计天数",
      },
    },
    color: habit.color,
    tooltip: {
      formatter: (datum: { date: string; value: number }) => {
        return {
          name: datum.date,
          value: `${datum.value} 天`,
        };
      },
    },
  };

  // 生成每周完成统计数据
  const weeklyData = [];
  for (let i = 0; i < dateRange.length; i += 7) {
    const weekDates = dateRange.slice(i, i + 7);
    const weekLabel = `第${Math.floor(i / 7) + 1}周`;
    const completedCount = weekDates.filter((date) => {
      const dateStr = formatDate(date);
      return habitRecords.some((r) => r.date === dateStr);
    }).length;
    weeklyData.push({
      week: weekLabel,
      value: completedCount,
    });
  }

  const weeklyConfig = {
    data: weeklyData,
    xField: "week",
    yField: "value",
    label: {
      position: "top",
      formatter: (v: { value: number }) => `${v.value || 0} 天`,
    },
    color: habit.color,
    yAxis: {
      min: 0,
      max: 7,
      title: {
        text: "完成天数",
      },
    },
    tooltip: {
      formatter: (datum: { week: string; value: number }) => {
        return {
          name: datum.week,
          value: `${datum.value || 0} 天`,
        };
      },
    },
  };

  return (
    <div className="time-habit-charts">
      <Card className="time-habit-charts__card">
        <div className="time-habit-charts__header">
          <Title level={3}>{habit.name} - 进度图表</Title>
        </div>

        <div className="time-habit-charts__content">
          <div className="time-habit-charts__section">
            <Title level={4}>每日完成状态</Title>
            <Line {...completionConfig} height={200} />
          </div>

          <div className="time-habit-charts__section">
            <Title level={4}>累计完成天数</Title>
            <Line {...cumulativeConfig} height={200} />
          </div>

          <div className="time-habit-charts__section">
            <Title level={4}>每周完成统计</Title>
            <Column {...weeklyConfig} height={200} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TimeHabitCharts;
