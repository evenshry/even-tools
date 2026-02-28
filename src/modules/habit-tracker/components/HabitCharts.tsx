import React from "react";
import { Card, Typography, Empty } from "antd";
import { Line, Column } from "@ant-design/charts";
import { get30DayRange, formatDate } from "@/modules/habit-tracker/utils/dateUtils";
import "@/modules/habit-tracker/components/HabitCharts.scss";

const { Title } = Typography;

interface HabitChartsProps {
  habit: HabitTracker.HabitWithRecords | null;
}

const HabitCharts: React.FC<HabitChartsProps> = ({ habit }) => {
  // 空状态处理：未选择习惯时显示提示
  if (!habit) {
    return (
      <div className="habit-charts habit-charts--empty">
        <Card className="habit-charts__card">
          <Empty description="请选择一个习惯查看图表" />
        </Card>
      </div>
    );
  }

  // 获取30天日期范围
  const dateRange = get30DayRange(new Date(habit.startDate));

  // 生成每日完成状态数据
  const lineData = dateRange.map((date) => {
    const dateStr = formatDate(date);
    const record = habit.records.find((r) => r.date === dateStr);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      value: record?.completed ? 1 : 0,
      type: "完成状态",
    };
  });

  // 生成累计完成天数数据
  const cumulativeData = dateRange.map((date) => {
    const completedCount = habit.records
      .filter((r) => r.completed && new Date(r.date) <= date)
      .length;
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      value: completedCount,
      type: "累计完成",
    };
  });

  // 每日完成状态折线图配置
  const lineConfig = {
    data: lineData,
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

  // 累计完成天数折线图配置
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
      max: Math.max(habit.targetDays, 10),
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
      const record = habit.records.find((r) => r.date === dateStr);
      return record?.completed;
    }).length;
    weeklyData.push({
      week: weekLabel,
      value: completedCount,
    });
  }

  // 每周完成统计柱状图配置
  const columnConfig = {
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
    <div className="habit-charts">
      <Card className="habit-charts__card">
        <div className="habit-charts__header">
          <Title level={3}>{habit.name} - 进度图表</Title>
        </div>

        <div className="habit-charts__content">
          <div className="habit-charts__section">
            <Title level={4}>每日完成状态</Title>
            <Line {...lineConfig} height={200} />
          </div>

          <div className="habit-charts__section">
            <Title level={4}>累计完成天数</Title>
            <Line {...cumulativeConfig} height={200} />
          </div>

          <div className="habit-charts__section">
            <Title level={4}>每周完成统计</Title>
            <Column {...columnConfig} height={200} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HabitCharts;
