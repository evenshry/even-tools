import React, { useState, useCallback } from "react";
import { Card, Button, Form, Input, DatePicker, InputNumber, Space, List, Tag, Popconfirm, Typography, Modal, message } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { dbManager } from "@/modules/habit-tracker/utils/indexedDB";
import { generateId, getRandomColor, formatDate } from "@/modules/habit-tracker/utils/dateUtils";
import "@/modules/habit-tracker/components/HabitManager.scss";

const { Title, Text } = Typography;

interface HabitManagerProps {
  habits: HabitTracker.Habit[];
  selectedHabitId: string | null;
  onHabitsChange: (habits: HabitTracker.Habit[]) => void;
  onHabitSelect: (habitId: string | null) => void;
}

const HabitManager: React.FC<HabitManagerProps> = ({ habits, selectedHabitId, onHabitsChange, onHabitSelect }) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitTracker.Habit | null>(null);

  const calculateEndDate = (startDate: Date, targetDays: number): Date => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + targetDays - 1);
    return endDate;
  };

  const handleAddHabit = useCallback(() => {
    setEditingHabit(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const handleEditHabit = useCallback((habit: HabitTracker.Habit) => {
    setEditingHabit(habit);
    form.setFieldsValue({
      name: habit.name,
      description: habit.description,
      startDate: dayjs(habit.startDate),
      targetDays: habit.targetDays,
    });
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteHabit = useCallback(async (habitId: string) => {
    try {
      await dbManager.deleteHabit(habitId);
      const updatedHabits = habits.filter((h) => h.id !== habitId);
      onHabitsChange(updatedHabits);
      if (selectedHabitId === habitId) {
        onHabitSelect(null);
      }
      message.success("习惯已删除");
    } catch (error) {
      console.error("删除习惯失败:", error);
      message.error("删除习惯失败，请重试");
    }
  }, [habits, selectedHabitId, onHabitsChange, onHabitSelect]);

  const handleFormSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const startDate = values.startDate ? new Date(values.startDate.valueOf()) : new Date();
      const endDate = calculateEndDate(startDate, values.targetDays);

      const habitData: HabitTracker.Habit = {
        id: editingHabit?.id || generateId(),
        name: values.name,
        description: values.description,
        color: editingHabit?.color || getRandomColor(),
        createdAt: editingHabit?.createdAt || Date.now(),
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        targetDays: values.targetDays,
      };

      if (editingHabit) {
        await dbManager.updateHabit(habitData);
        message.success("习惯已更新");
      } else {
        await dbManager.addHabit(habitData);
        message.success("习惯已添加");
      }

      const updatedHabits = editingHabit
        ? habits.map((h) => (h.id === habitData.id ? habitData : h))
        : [...habits, habitData];

      onHabitsChange(updatedHabits);
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("操作失败:", error);
      message.error("操作失败，请检查输入后重试");
    }
  }, [form, editingHabit, habits, onHabitsChange]);

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingHabit(null);
  }, [form]);

  return (
    <div className="habit-manager">
      <div className="habit-manager__header">
        <Title level={3}>习惯管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddHabit}>
          添加习惯
        </Button>
      </div>

      <List
        className="habit-manager__list"
        dataSource={habits}
        renderItem={(habit) => (
          <List.Item
            className={`habit-manager__item`}
            onClick={() => onHabitSelect(habit.id)}
          >
            <Card
              className={`habit-manager__card ${selectedHabitId === habit.id ? "habit-manager__card--selected" : ""}`}
              style={{ borderColor: habit.color }}
            >
              <div className="habit-manager__card-header">
                <div className="habit-manager__card-title">
                  <Text strong>{habit.name}</Text>
                  <Tag color={habit.color}>{habit.targetDays}天</Tag>
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
                    title="确认删除"
                    description="确定要删除这个习惯吗？"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteHabit(habit.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="确定"
                    cancelText="取消"
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
                <Text type="secondary" className="habit-manager__card-description">
                  {habit.description}
                </Text>
              )}
              <div className="habit-manager__card-footer">
                <Text type="secondary" className="habit-manager__card-date">
                  {formatDate(new Date(habit.startDate))} - {formatDate(new Date(habit.endDate))}
                </Text>
              </div>
            </Card>
          </List.Item>
        )}
      />

      {habits.length === 0 && (
        <div className="habit-manager__empty">
          <Text type="secondary">还没有习惯，点击上方按钮添加一个吧！</Text>
        </div>
      )}

      <Modal
        title={editingHabit ? "编辑习惯" : "添加习惯"}
        open={isModalVisible}
        onOk={handleFormSubmit}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="习惯名称"
            name="name"
            rules={[{ required: true, message: "请输入习惯名称" }]}
          >
            <Input placeholder="例如：每天跑步" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="描述这个习惯（可选）" rows={3} />
          </Form.Item>
          <Form.Item
            label="开始日期"
            name="startDate"
            rules={[{ required: true, message: "请选择开始日期" }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="目标天数"
            name="targetDays"
            rules={[{ required: true, message: "请输入目标天数" }]}
            initialValue={30}
          >
            <InputNumber min={1} max={365} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HabitManager;
