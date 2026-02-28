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
      if (loadedHabits.length > 0 && !selectedHabitId) {
        setSelectedHabitId(loadedHabits[0].id);
      }
    } catch {
      message.error("加载习惯数据失败");
    }
  }, [selectedHabitId]);

  /**
   * 加载所有时段习惯
   */
  const loadTimeHabits = useCallback(async () => {
    try {
      const loadedTimeHabits = await dbManager.getAllTimeHabits();
      setTimeHabits(loadedTimeHabits);
      if (loadedTimeHabits.length > 0 && !selectedTimeHabitId) {
        setSelectedTimeHabitId(loadedTimeHabits[0].id);
      }
    } catch {
      message.error("加载时段习惯数据失败");
    }
  }, [selectedTimeHabitId]);

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
      const completionRate = records.length > 0 ? (completedDays / records.length) * 100 : 0;
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
      
      let completedDays = 0;
      let completionRate = 0;

      if (habit.intervalMinutes) {
        completedDays = records.length;
        const startDate = new Date(habit.startDate);
        const endDate = habit.endDate ? new Date(habit.endDate) : new Date();
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const targetTimesPerDay = Math.floor((24 * 60) / habit.intervalMinutes);
        const totalTargetTimes = totalDays * targetTimesPerDay;
        completionRate = totalTargetTimes > 0 ? (completedDays / totalTargetTimes) * 100 : 0;
      } else {
        const uniqueDates = new Set(records.map((r) => r.date));
        completedDays = uniqueDates.size;
        
        const startDate = new Date(habit.startDate);
        const endDate = habit.endDate ? new Date(habit.endDate) : new Date();
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        let activeDays = 0;
        for (let i = 0; i < totalDays; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          const weekday = currentDate.getDay();
          
          switch (habit.frequency) {
            case "daily":
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
            case "interval":
              activeDays++;
              break;
          }
        }
        
        completionRate = activeDays > 0 ? (completedDays / activeDays) * 100 : 0;
      }
      
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
      const dateStr = date.toISOString().split("T")[0];
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
   * 处理数据导入完成后的刷新
   */
  const handleDataImport = useCallback(async () => {
    await loadHabits();
    await loadTimeHabits();
  }, [loadHabits, loadTimeHabits]);

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
                    <HabitCharts key={`${selectedHabitId}-${selectedHabitWithRecords.records.length}`} habit={selectedHabitWithRecords} />
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
                    <TimeHabitCharts key={`${selectedTimeHabitId}-${timeHabitRecords.length}`} habit={selectedTimeHabitWithRecords} records={timeHabitRecords} />
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
