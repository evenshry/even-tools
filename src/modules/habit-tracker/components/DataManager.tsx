import React, { useCallback } from "react";
import { Button, Space, Typography, message, Modal } from "antd";
import { DownloadOutlined, UploadOutlined, DeleteOutlined, FileExcelOutlined } from "@ant-design/icons";
import { dbManager } from "@/modules/habit-tracker/utils/indexedDB";
import "@/modules/habit-tracker/components/DataManager.scss";

const { Text } = Typography;

interface DataManagerProps {
  onDataImport: () => void;
}

const DataManager: React.FC<DataManagerProps> = ({ onDataImport }) => {
  const handleExportCSV = useCallback(async () => {
    try {
      const habits = await dbManager.getAllHabits();
      
      if (habits.length === 0) {
        message.warning("没有数据可导出");
        return;
      }

      let csvContent = "习惯名称,描述,开始日期,结束日期,目标天数,日期,完成状态\n";

      for (const habit of habits) {
        const records = await dbManager.getHabitRecordsByHabit(habit.id);
        
        if (records.length === 0) {
          csvContent += `"${habit.name}","${habit.description || ''}","${new Date(habit.startDate).toLocaleDateString()}","${new Date(habit.endDate).toLocaleDateString()}",${habit.targetDays},,未记录\n`;
        } else {
          for (const record of records) {
            const status = record.completed ? "已完成" : "未完成";
            csvContent += `"${habit.name}","${habit.description || ''}","${new Date(habit.startDate).toLocaleDateString()}","${new Date(habit.endDate).toLocaleDateString()}",${habit.targetDays},"${record.date}","${status}"\n`;
          }
        }
      }

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `habit-tracker-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success("CSV导出成功");
    } catch {
      message.error("CSV导出失败");
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const data = await dbManager.exportData();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `habit-tracker-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success("数据导出成功");
    } catch {
      message.error("数据导出失败");
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as HabitTracker.ExportData;

        if (!data.habits || !data.records) {
          throw new Error("Invalid data format");
        }

        Modal.confirm({
          title: "确认导入",
          content: (
            <div>
              <p>即将导入以下数据：</p>
              <p>习惯数量：{data.habits.length}</p>
              <p>记录数量：{data.records.length}</p>
              <p>导出日期：{new Date(data.exportDate).toLocaleString()}</p>
              <p style={{ color: "#ff4d4f" }}>注意：导入将覆盖当前数据，请确认是否继续？</p>
            </div>
          ),
          okText: "确认导入",
          cancelText: "取消",
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              await dbManager.clearAll();
              await dbManager.importData(data);
              message.success("数据导入成功");
              onDataImport();
            } catch {
              message.error("数据导入失败");
            }
          },
        });
      } catch {
        message.error("文件格式错误，请选择正确的备份文件");
      }
    };
    input.click();
  }, [onDataImport]);

  const handleClear = useCallback(() => {
    Modal.confirm({
      title: "确认清空",
      content: "确定要清空所有数据吗？此操作不可恢复！",
      okText: "确定清空",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dbManager.clearAll();
          message.success("数据已清空");
          onDataImport();
        } catch {
          message.error("清空数据失败");
        }
      },
    });
  }, [onDataImport]);

  return (
    <div className="data-manager">
      <div className="data-manager__actions">
        <Space size="middle">
          <Button icon={<FileExcelOutlined />} onClick={handleExportCSV}>
            导出CSV
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出JSON
          </Button>
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            导入数据
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleClear}>
            清空数据
          </Button>
        </Space>
      </div>
      <div className="data-manager__info">
        <Text type="secondary">导出CSV可在Excel等表格软件中查看；导出JSON用于数据备份；导入数据可恢复之前的备份。清空数据将删除所有习惯和记录。</Text>
      </div>
    </div>
  );
};

export default DataManager;
