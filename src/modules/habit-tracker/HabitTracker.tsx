/**
 * 习惯追踪器主组件
 * 负责管理日常习惯和时段习惯的整体布局、数据加载和状态管理
 */

import React, { useEffect, useState, useCallback } from "react";
import { Layout, Tabs, message } from "antd";
import HabitManager from "@/modules/habit-tracker/components/HabitManager";
import HabitCalendar from "@/modules/habit-tracker/components/HabitCalendar";
import HabitCharts from "@/modules/habit-tracker/components/HabitCharts";
import DataManager from "@/modules/habit-tracker/components/DataManager";
import TimeHabitManager from "@/modules/habit-tracker/components/TimeHabitManager";
import TimeHabitTimeline from "@/modules/habit-tracker/components/TimeHabitTimeline";
import TimeHabitCharts from "@/modules/habit-tracker/components/TimeHabitCharts";
import ModuleHeader from "@/components/ModuleHeader";
import { dbManager } from "@/modules/habit-tracker/utils/indexedDB";
import { calculateCompletionRate, formatDate } from "@/modules/habit-tracker/utils/dateUtils";
import "@/modules/habit-tracker/HabitTracker.scss";

const { Sider, Content } = Layout;

const HabitTracker: React.FC = () => {
  const [habits, setHabits] = useState<HabitTracker.Habit[]>([]);
  const [timeHabits, setTimeHabits] = useState<HabitTracker.TimeHabit[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedHabitWithRecords, setSelectedHabitWithRecords] = useState<HabitTracker.HabitWithRecords | null>(null);
  const [selectedTimeHabitId, setSelectedTimeHabitId] = useState<string | null>(null);
  const [selectedTimeHabitWithRecords, setSelectedTimeHabitWithRecords] = useState<HabitTracker.TimeHabitWithRecords | null>(null);
  const [timeHabitRecords, setTimeHabitRecords] = useState<HabitTracker.TimeHabitRecord[]>([]);
  const [activeTab, setActiveTab] = useState("daily");

  /**
   * 加载所有日常习惯
   */
  const loadHabits = useCallback(async () => {
    try {
      const loadedHabits = await dbManager.getAllHabits();
      setHabits(loadedHabits);
      // 当前选中项仍存在则保留，否则回退到第一个习惯，避免重复全量加载
      setSelectedHabitId((currentId) => {
        if (currentId && loadedHabits.some((habit) => habit.id === currentId)) {
          return currentId;
        }
        return loadedHabits[0]?.id ?? null;
      });
    } catch {
      message.error("加载习惯数据失败");
    }
  }, []);

  /**
   * 加载所有时段习惯
   */
  const loadTimeHabits = useCallback(async () => {
    try {
      const loadedTimeHabits = await dbManager.getAllTimeHabits();
      setTimeHabits(loadedTimeHabits);
      setSelectedTimeHabitId((currentId) => {
        if (currentId && loadedTimeHabits.some((habit) => habit.id === currentId)) {
          return currentId;
        }
        return loadedTimeHabits[0]?.id ?? null;
      });
    } catch {
      message.error("加载时段习惯数据失败");
    }
  }, []);

  /**
   * 加载所有时段习惯记录
   */
  const loadAllTimeHabitRecords = useCallback(async () => {
    try {
      const records = await dbManager.getAllTimeHabitRecords();
      setTimeHabitRecords(records);
    } catch {
      message.error("加载时段习惯记录失败");
    }
  }, []);

  /**
   * 加载指定习惯及其记录
   * @param habitId - 习惯ID
   * @returns 包含记录、完成天数和完成率的习惯对象
   */
  const loadHabitWithRecords = useCallback(async (habitId: string): Promise<HabitTracker.HabitWithRecords | null> => {
    try {
      const habit = await dbManager.getHabit(habitId);
      if (!habit) return null;
      const records = await dbManager.getHabitRecordsByHabit(habitId);
      const completedDays = records.filter((r) => r.completed).length;
      // 完成率以目标天数为分母，避免记录数量做分母导致恒为 100%
      const completionRate = calculateCompletionRate(records, habit.targetDays);
      return { ...habit, records, completedDays, completionRate };
    } catch {
      message.error("加载习惯记录失败");
      return null;
    }
  }, []);

  /**
   * 加载指定时段习惯及其记录
   * @param habitId - 习惯ID
   * @returns 包含记录、完成天数和完成率的时段习惯对象
   */
  const loadTimeHabitWithRecords = useCallback(async (habitId: string): Promise<HabitTracker.TimeHabitWithRecords | null> => {
    try {
      const habit = await dbManager.getTimeHabit(habitId);
      if (!habit) return null;
      const records = await dbManager.getTimeHabitRecordsByHabit(habitId);

      // 统一统计口径：完成天数按自然日去重（同一天多次打卡只算一天）
      const completedDays = new Set(records.map((r) => r.date)).size;

      // 目标天数按习惯频率统计起止日期内的活跃日
      const startDate = new Date(habit.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = habit.endDate ? new Date(habit.endDate) : new Date();
      endDate.setHours(0, 0, 0, 0);

      let activeDays = 0;
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const weekday = cursor.getDay();
        switch (habit.frequency) {
          case "daily":
          case "interval":
            activeDays++;
            break;
          case "weekdays":
            if (weekday >= 1 && weekday <= 5) activeDays++;
            break;
          case "weekends":
            if (weekday === 0 || weekday === 6) activeDays++;
            break;
          case "custom":
            if (habit.weekdays?.includes(weekday)) activeDays++;
            break;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const completionRate = activeDays > 0
        ? Math.min(100, Math.max(0, (completedDays / activeDays) * 100))
        : 0;

      return { ...habit, records, completedDays, completionRate };
    } catch {
      message.error("加载时段习惯记录失败");
      return null;
    }
  }, []);

  useEffect(() => {
    if (selectedHabitId) {
      loadHabitWithRecords(selectedHabitId).then(setSelectedHabitWithRecords);
    } else {
      setSelectedHabitWithRecords(null);
    }
  }, [selectedHabitId, loadHabitWithRecords]);

  useEffect(() => {
    if (selectedTimeHabitId) {
      loadTimeHabitWithRecords(selectedTimeHabitId).then(setSelectedTimeHabitWithRecords);
    } else {
      setSelectedTimeHabitWithRecords(null);
    }
  }, [selectedTimeHabitId, loadTimeHabitWithRecords]);

  /**
   * 处理日常习惯列表变化
   */
  const handleHabitsChange = useCallback(async (updatedHabits: HabitTracker.Habit[]) => {
    setHabits(updatedHabits);
  }, []);

  /**
   * 处理时段习惯列表变化
   */
  const handleTimeHabitsChange = useCallback(async (updatedTimeHabits: HabitTracker.TimeHabit[]) => {
    setTimeHabits(updatedTimeHabits);
  }, []);

  /**
   * 处理日常习惯选择
   */
  const handleHabitSelect = useCallback(async (habitId: string | null) => {
    setSelectedHabitId(habitId);
    if (habitId) {
      const updatedHabit = await loadHabitWithRecords(habitId);
      setSelectedHabitWithRecords(updatedHabit);
    } else {
      setSelectedHabitWithRecords(null);
    }
  }, [loadHabitWithRecords]);

  /**
   * 处理时段习惯选择
   */
  const handleTimeHabitSelect = useCallback(async (habitId: string | null) => {
    setSelectedTimeHabitId(habitId);
    if (habitId) {
      const updatedHabit = await loadTimeHabitWithRecords(habitId);
      setSelectedTimeHabitWithRecords(updatedHabit);
    } else {
      setSelectedTimeHabitWithRecords(null);
    }
  }, [loadTimeHabitWithRecords]);

  /**
   * 切换日常习惯的打卡记录
   */
  const handleToggleRecord = useCallback(async (date: Date) => {
    if (!selectedHabitId) return;

    try {
      // 打卡日期使用本地日期，避免 toISOString 在 UTC+8 凌晨串到前一天
      const dateStr = formatDate(date);
      const records = await dbManager.getHabitRecordsByHabit(selectedHabitId);
      const existingRecord = records.find((r) => r.date === dateStr);

      if (existingRecord) {
        await dbManager.deleteHabitRecord(existingRecord.id);
        message.success("记录已取消");
      } else {
        const record: HabitTracker.HabitRecord = {
          id: `${selectedHabitId}-${dateStr}`,
          habitId: selectedHabitId,
          date: dateStr,
          completed: true,
        };
        await dbManager.addHabitRecord(record);
        message.success("记录已添加");
      }
      await loadHabits();
      if (selectedHabitId) {
        const updatedHabit = await loadHabitWithRecords(selectedHabitId);
        setSelectedHabitWithRecords(updatedHabit);
      }
    } catch {
      message.error("操作失败");
    }
  }, [selectedHabitId, loadHabits, loadHabitWithRecords]);

  /**
   * 处理数据导入/清空后的刷新：重置选中项并重新加载全部数据
   */
  const handleDataImport = useCallback(async () => {
    setSelectedHabitId(null);
    setSelectedTimeHabitId(null);
    setSelectedHabitWithRecords(null);
    setSelectedTimeHabitWithRecords(null);
    await loadHabits();
    await loadTimeHabits();
    await loadAllTimeHabitRecords();
  }, [loadHabits, loadTimeHabits, loadAllTimeHabitRecords]);

  /**
   * 处理时段习惯记录变化
   */
  const handleTimeHabitRecordChange = useCallback(async () => {
    await loadAllTimeHabitRecords();
    if (selectedTimeHabitId) {
      const updatedHabit = await loadTimeHabitWithRecords(selectedTimeHabitId);
      setSelectedTimeHabitWithRecords(updatedHabit);
    }
  }, [loadAllTimeHabitRecords, loadTimeHabitWithRecords, selectedTimeHabitId]);

  useEffect(() => {
    loadHabits();
    loadTimeHabits();
    loadAllTimeHabitRecords();
  }, [loadHabits, loadTimeHabits, loadAllTimeHabitRecords]);

  return (
    <Layout className="habit-tracker">
      <ModuleHeader title="习惯追踪器" />

      <Layout>
        <Sider width={320} className="habit-tracker__sider">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="habit-tracker__tabs"
            items={[
              {
                key: "daily",
                label: "日常习惯",
                children: (
                  <HabitManager
                    habits={habits}
                    selectedHabitId={selectedHabitId}
                    onHabitsChange={handleHabitsChange}
                    onHabitSelect={handleHabitSelect}
                  />
                ),
              },
              {
                key: "time",
                label: "时段习惯",
                children: (
                  <TimeHabitManager
                    timeHabits={timeHabits}
                    selectedTimeHabitId={selectedTimeHabitId}
                    onTimeHabitsChange={handleTimeHabitsChange}
                    onTimeHabitSelect={handleTimeHabitSelect}
                  />
                ),
              },
            ]}
          />
        </Sider>

        <Layout className="habit-tracker__main">
          <Content className="habit-tracker__content">
            <div className="habit-tracker__data-manager">
              <DataManager onDataImport={handleDataImport} />
            </div>
            {activeTab === "daily" ? (
              <>
                <div className="habit-tracker__calendar">
                  {selectedHabitWithRecords ? (
                    <HabitCalendar habit={selectedHabitWithRecords} onToggleRecord={handleToggleRecord} />
                  ) : (
                    <div className="habit-tracker__empty">请选择或创建一个习惯</div>
                  )}
                </div>

                <div className="habit-tracker__charts">
                  {selectedHabitWithRecords ? (
                    <HabitCharts key={selectedHabitId} habit={selectedHabitWithRecords} />
                  ) : (
                    <div className="habit-tracker__empty">请选择一个习惯查看图表</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="habit-tracker__timeline">
                  {selectedTimeHabitWithRecords ? (
                    <TimeHabitTimeline habit={selectedTimeHabitWithRecords} onRecordChange={handleTimeHabitRecordChange} />
                  ) : (
                    <div className="habit-tracker__empty">请选择或创建一个时段习惯</div>
                  )}
                </div>

                <div className="habit-tracker__charts">
                  {selectedTimeHabitWithRecords ? (
                    <TimeHabitCharts key={selectedTimeHabitId} habit={selectedTimeHabitWithRecords} records={timeHabitRecords} />
                  ) : (
                    <div className="habit-tracker__empty">请选择一个时段习惯查看图表</div>
                  )}
                </div>
              </>
            )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default HabitTracker;
