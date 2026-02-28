import React, { useState, useCallback, useMemo } from "react";
import { Card, Button, Form, Input, TimePicker, DatePicker, Select, Switch, InputNumber, Space, List, Tag, Popconfirm, Typography, Modal, message, Collapse } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, ClockCircleOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { dbManager } from "@/modules/habit-tracker/utils/indexedDB";
import { generateId, getRandomColor } from "@/modules/habit-tracker/utils/dateUtils";
import { habitTemplates, type HabitTemplate } from "@/modules/habit-tracker/data/habitTemplates";
import "@/modules/habit-tracker/components/TimeHabitManager.scss";

const { Title, Text } = Typography;
const { Option } = Select;

interface TimeHabitManagerProps {
  timeHabits: HabitTracker.TimeHabit[];
  selectedTimeHabitId: string | null;
  onTimeHabitsChange: (timeHabits: HabitTracker.TimeHabit[]) => void;
  onTimeHabitSelect: (habitId: string | null) => void;
}

const TimeHabitManager: React.FC<TimeHabitManagerProps> = ({ timeHabits, selectedTimeHabitId, onTimeHabitsChange, onTimeHabitSelect }) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitTracker.TimeHabit | null>(null);

  const handleAddHabit = useCallback(() => {
    setEditingHabit(null);
    setIsTemplateModalVisible(true);
  }, []);

  const handleSelectTemplate = useCallback((template: HabitTemplate) => {
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      targetTime: dayjs(template.targetTime, "HH:mm"),
      timeRange: template.timeRange ? dayjs(template.timeRange, "HH:mm") : null,
      frequency: template.frequency,
      weekdays: template.weekdays,
      intervalMinutes: template.intervalMinutes,
      reminderEnabled: template.reminderEnabled,
      reminderMinutes: template.reminderMinutes,
      startDate: dayjs(),
    });
    setIsTemplateModalVisible(false);
    setIsModalVisible(true);
  }, [form]);

  const handleCustomHabit = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      targetTime: dayjs("09:00", "HH:mm"),
      frequency: "daily",
      weekdays: [1, 2, 3, 4, 5],
      reminderEnabled: false,
      reminderMinutes: 5,
      startDate: dayjs(),
    });
    setIsTemplateModalVisible(false);
    setIsModalVisible(true);
  }, [form]);

  const handleEditHabit = useCallback((habit: HabitTracker.TimeHabit) => {
    setEditingHabit(habit);
    form.setFieldsValue({
      name: habit.name,
      description: habit.description,
      targetTime: dayjs(habit.targetTime, "HH:mm"),
      timeRange: habit.timeRange ? dayjs(habit.timeRange, "HH:mm") : null,
      frequency: habit.frequency,
      weekdays: habit.weekdays,
      intervalMinutes: habit.intervalMinutes,
      reminderEnabled: habit.reminderEnabled,
      reminderMinutes: habit.reminderMinutes,
      startDate: dayjs(habit.startDate),
    });
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteHabit = useCallback(async (habitId: string) => {
    try {
      await dbManager.deleteTimeHabit(habitId);
      const updatedHabits = timeHabits.filter((h) => h.id !== habitId);
      onTimeHabitsChange(updatedHabits);
      if (selectedTimeHabitId === habitId) {
        onTimeHabitSelect(null);
      }
      message.success("时段习惯已删除");
    } catch {
      message.error("删除时段习惯失败");
    }
  }, [timeHabits, selectedTimeHabitId, onTimeHabitsChange, onTimeHabitSelect]);

  const handleFormSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const startDate = values.startDate ? new Date(values.startDate.valueOf()) : new Date();
      
      const habitData: HabitTracker.TimeHabit = {
        id: editingHabit?.id || generateId(),
        name: values.name,
        description: values.description,
        color: editingHabit?.color || getRandomColor(),
        createdAt: editingHabit?.createdAt || Date.now(),
        targetTime: values.targetTime.format("HH:mm"),
        timeRange: values.timeRange ? values.timeRange.format("HH:mm") : undefined,
        reminderEnabled: values.reminderEnabled || false,
        reminderMinutes: values.reminderMinutes || 5,
        frequency: values.frequency || "daily",
        weekdays: values.weekdays || [1, 2, 3, 4, 5],
        intervalMinutes: values.intervalMinutes,
        startDate: startDate.getTime(),
        endDate: values.endDate ? new Date(values.endDate.valueOf()).getTime() : undefined,
      };

      if (editingHabit) {
        await dbManager.updateTimeHabit(habitData);
        message.success("时段习惯已更新");
      } else {
        await dbManager.addTimeHabit(habitData);
        message.success("时段习惯已添加");
      }

      const updatedHabits = editingHabit
        ? timeHabits.map((h) => (h.id === habitData.id ? habitData : h))
        : [...timeHabits, habitData];

      onTimeHabitsChange(updatedHabits);
      setIsModalVisible(false);
      form.resetFields();
    } catch {
      message.error("操作失败");
    }
  }, [form, editingHabit, timeHabits, onTimeHabitsChange]);

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingHabit(null);
  }, [form]);

  const handleTemplateModalCancel = useCallback(() => {
    setIsTemplateModalVisible(false);
  }, []);

  const getFrequencyText = useCallback((frequency: string, weekdays?: number[], intervalMinutes?: number) => {
    const weekdayMap = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    let text = "";
    
    switch (frequency) {
      case "daily":
        text = "每天";
        break;
      case "weekdays":
        text = "工作日";
        break;
      case "weekends":
        text = "周末";
        break;
      case "custom":
        text = weekdays?.map((d) => weekdayMap[d]).join("、") || "自定义";
        break;
      default:
        text = "每天";
    }

    if (intervalMinutes) {
      text += `，每隔 ${intervalMinutes} 分钟`;
    }

    return text;
  }, []);

  const templates = useMemo(() => habitTemplates.map((template, index) => (
    <Card
      key={index}
      hoverable
      onClick={() => handleSelectTemplate(template)}
      style={{ cursor: "pointer" }}
    >
      <div style={{ marginBottom: 8 }}>
        <Text strong style={{ fontSize: 16 }}>{template.name}</Text>
      </div>
      <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
        {template.description}
      </Text>
      <div>
        <Tag color="blue">{template.targetTime}</Tag>
        <Tag>{getFrequencyText(template.frequency, template.weekdays, template.intervalMinutes)}</Tag>
        {template.reminderEnabled && <Tag color="green">已开启提醒</Tag>}
      </div>
    </Card>
  )), [handleSelectTemplate, getFrequencyText]);

  return (
    <div className="time-habit-manager">
      <div className="time-habit-manager__header">
        <Title level={3}>时段习惯</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddHabit}>
          添加时段习惯
        </Button>
      </div>

      <List
        className="time-habit-manager__list"
        dataSource={timeHabits}
        renderItem={(habit) => (
          <List.Item
            className={`time-habit-manager__item`}
            onClick={() => onTimeHabitSelect(habit.id)}
          >
            <Card
              className={`time-habit-manager__card ${selectedTimeHabitId === habit.id ? "time-habit-manager__card--selected" : ""}`}
              style={{ borderColor: habit.color }}
            >
              <div className="time-habit-manager__card-header">
                <div className="time-habit-manager__card-title">
                  <ClockCircleOutlined style={{ color: habit.color, marginRight: 8 }} />
                  <Text strong>{habit.name}</Text>
                  <Tag color={habit.color}>{habit.targetTime}</Tag>
                </div>
                <Space>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditHabit(habit);
                    }}
                  />
                  <Popconfirm
                    title="删除时段习惯"
                    description="删除后，该习惯的所有记录也将被删除，确定要继续吗？"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteHabit(habit.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="确定删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </Space>
              </div>
              {habit.description && (
                <Text type="secondary" className="time-habit-manager__card-description">
                  {habit.description}
                </Text>
              )}
              <div className="time-habit-manager__card-footer">
                <Text type="secondary" className="time-habit-manager__card-info">
                  {getFrequencyText(habit.frequency, habit.weekdays, habit.intervalMinutes)}
                </Text>
                {habit.timeRange && (
                  <Text type="secondary" className="time-habit-manager__card-info">
                    至 {habit.timeRange}
                  </Text>
                )}
              </div>
            </Card>
          </List.Item>
        )}
      />

      {timeHabits.length === 0 && (
        <div className="time-habit-manager__empty">
          <ClockCircleOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
          <Text type="secondary" style={{ fontSize: 16 }}>
            还没有时段习惯，点击上方按钮添加一个吧！
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              时段习惯可以帮助你养成定时打卡的好习惯，比如每天喝水、定时休息等
            </Text>
          </div>
        </div>
      )}

      <Modal
        title="选择习惯模板"
        open={isTemplateModalVisible}
        onCancel={handleTemplateModalCancel}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 24 }}>
          <Text type="secondary">选择一个预设模板快速创建习惯，或者自定义创建</Text>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
          {templates}
        </div>
        <Button block onClick={handleCustomHabit} style={{ marginBottom: 8 }}>
          自定义创建习惯
        </Button>
      </Modal>

      <Modal
        title={editingHabit ? "编辑时段习惯" : "添加时段习惯"}
        open={isModalVisible}
        onOk={handleFormSubmit}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="习惯名称"
            name="name"
            rules={[{ required: true, message: "请输入习惯名称" }]}
            extra="给你的习惯起个名字，比如：喝水、站起来活动"
          >
            <Input placeholder="例如：喝水、起来走一走" />
          </Form.Item>
          <Form.Item label="描述" name="description" extra="简单描述这个习惯的目的（可选）">
            <Input.TextArea placeholder="描述这个习惯（可选）" rows={3} />
          </Form.Item>
          <Form.Item
            label="目标时间"
            name="targetTime"
            rules={[{ required: true, message: "请选择目标时间" }]}
            extra="每天在这个时间开始执行习惯"
          >
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="频率"
            name="frequency"
            rules={[{ required: true, message: "请选择频率" }]}
            extra="选择习惯执行的日期频率"
          >
            <Select>
              <Option value="daily">每天</Option>
              <Option value="weekdays">工作日（周一至周五）</Option>
              <Option value="weekends">周末（周六、周日）</Option>
              <Option value="custom">自定义星期</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.frequency !== currentValues.frequency}
          >
            {({ getFieldValue }) =>
              getFieldValue("frequency") === "custom" ? (
                <Form.Item
                  label="选择星期"
                  name="weekdays"
                  rules={[{ required: true, message: "请选择星期" }]}
                  extra="选择习惯执行的星期"
                >
                  <Select mode="multiple" placeholder="选择星期">
                    <Option value={0}>周日</Option>
                    <Option value={1}>周一</Option>
                    <Option value={2}>周二</Option>
                    <Option value={3}>周三</Option>
                    <Option value={4}>周四</Option>
                    <Option value={5}>周五</Option>
                    <Option value={6}>周六</Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Collapse
            items={[
              {
                key: "1",
                label: (
                  <span>
                    <SettingOutlined style={{ marginRight: 8 }} />
                    高级设置
                  </span>
                ),
                children: (
                  <>
                    <Form.Item label="结束时间（可选）" name="timeRange" extra="习惯执行的结束时间，不填则全天有效">
                      <TimePicker format="HH:mm" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item 
                      label="时间间隔（可选）" 
                      name="intervalMinutes"
                      extra="设置后可以在一天内多次打卡，比如每隔60分钟喝一次水"
                    >
                      <InputNumber min={1} max={1440} placeholder="如：60（表示每隔60分钟）" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item
                      label="开始日期"
                      name="startDate"
                      rules={[{ required: true, message: "请选择开始日期" }]}
                      extra="习惯从这一天开始执行"
                    >
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label="结束日期（可选）" name="endDate" extra="习惯执行到这一天结束，不填则长期有效">
                      <DatePicker style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label="启用提醒" name="reminderEnabled" valuePropName="checked" extra="开启后会在目标时间前提醒你">
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) => prevValues.reminderEnabled !== currentValues.reminderEnabled}
                    >
                      {({ getFieldValue }) =>
                        getFieldValue("reminderEnabled") ? (
                          <Form.Item
                            label="提前提醒（分钟）"
                            name="reminderMinutes"
                            rules={[{ required: true, message: "请输入提前提醒时间" }]}
                            extra="在目标时间前多少分钟提醒你"
                          >
                            <InputNumber min={1} max={60} style={{ width: "100%" }} />
                          </Form.Item>
                        ) : null
                      }
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default TimeHabitManager;
