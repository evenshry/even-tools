import React, { useCallback } from "react";
import { Button, Space, Typography, message, Modal } from "antd";
import { DownloadOutlined, UploadOutlined, DeleteOutlined, FileExcelOutlined } from "@ant-design/icons";
import { dbManager } from "@/modules/habit-tracker/utils/indexedDB";
import { formatDate } from "@/modules/habit-tracker/utils/dateUtils";
import { useThemeStore } from "@/store/useThemeStore";
import { semanticColors } from "@/styles/themeColors";
import "@/modules/habit-tracker/components/DataManager.scss";

const { Text } = Typography;

interface DataManagerProps {
  onDataImport: () => void;
}

/** CSV 字段转义：处理引号、逗号与换行，并阻止 Excel 公式注入 */
const escapeCsvField = (value: string | number | undefined | null): string => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * 校验备份文件结构，避免缺字段的数据写入数据库
 * @throws 当数据结构不符合导出格式时抛出错误
 */
const validateImportData = (data: unknown): HabitTracker.ExportData => {
  if (!isObject(data)) {
    throw new Error("备份文件格式不正确");
  }

  const habits = data.habits;
  const records = data.records;
  if (!Array.isArray(habits) || !Array.isArray(records)) {
    throw new Error("备份文件缺少 habits 或 records 数组");
  }

  const isHabit = (item: unknown): boolean =>
    isObject(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.startDate === "number" &&
    typeof item.targetDays === "number";

  const isRecord = (item: unknown): boolean =>
    isObject(item) &&
    typeof item.id === "string" &&
    typeof item.habitId === "string" &&
    typeof item.date === "string";

  const isTimeHabit = (item: unknown): boolean =>
    isObject(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.startDate === "number";

  const isTimeRecord = (item: unknown): boolean =>
    isObject(item) &&
    typeof item.id === "string" &&
    typeof item.habitId === "string" &&
    typeof item.date === "string";

  if (!habits.every(isHabit) || !records.every(isRecord)) {
    throw new Error("习惯或记录数据格式不正确");
  }

  const timeHabits = data.timeHabits;
  const timeHabitRecords = data.timeHabitRecords;

  if (timeHabits !== undefined && (!Array.isArray(timeHabits) || !timeHabits.every(isTimeHabit))) {
    throw new Error("时段习惯数据格式不正确");
  }

  if (timeHabitRecords !== undefined && (!Array.isArray(timeHabitRecords) || !timeHabitRecords.every(isTimeRecord))) {
    throw new Error("时段习惯记录格式不正确");
  }

  return {
    habits: habits as HabitTracker.Habit[],
    records: records as HabitTracker.HabitRecord[],
    timeHabits: timeHabits as HabitTracker.TimeHabit[] | undefined,
    timeHabitRecords: timeHabitRecords as HabitTracker.TimeHabitRecord[] | undefined,
    exportDate: typeof data.exportDate === "number" ? data.exportDate : Date.now(),
  };
};

/** 触发浏览器下载 */
const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const DataManager: React.FC<DataManagerProps> = ({ onDataImport }) => {
  const mode = useThemeStore((s) => s.mode);

  const handleExportCSV = useCallback(async () => {
    try {
      const habits = await dbManager.getAllHabits();

      if (habits.length === 0) {
        message.warning("没有数据可导出");
        return;
      }

      const rows: Array<Array<string | number>> = [];

      for (const habit of habits) {
        const records = await dbManager.getHabitRecordsByHabit(habit.id);
        const startDate = formatDate(new Date(habit.startDate));
        const endDate = formatDate(new Date(habit.endDate));

        if (records.length === 0) {
          rows.push([habit.name, habit.description ?? "", startDate, endDate, habit.targetDays, "", "未记录"]);
          continue;
        }

        for (const record of records) {
          rows.push([
            habit.name,
            habit.description ?? "",
            startDate,
            endDate,
            habit.targetDays,
            record.date,
            record.completed ? "已完成" : "未完成",
          ]);
        }
      }

      const header = ["习惯名称", "描述", "开始日期", "结束日期", "目标天数", "日期", "完成状态"];
      const csvContent = [header, ...rows]
        .map((row) => row.map(escapeCsvField).join(","))
        .join("\n");

      downloadFile(
        `\uFEFF${csvContent}`,
        `habit-tracker-${formatDate(new Date())}.csv`,
        "text/csv;charset=utf-8;"
      );
      message.success("CSV导出成功");
    } catch {
      message.error("CSV导出失败");
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const data = await dbManager.exportData();
      downloadFile(
        JSON.stringify(data, null, 2),
        `habit-tracker-backup-${formatDate(new Date())}.json`,
        "application/json"
      );
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
        // 先完整解析并校验，校验通过后才允许进入覆盖流程
        const data = validateImportData(JSON.parse(text));

        Modal.confirm({
          title: "确认导入",
          content: (
            <div>
              <p>即将导入以下数据：</p>
              <p>习惯数量：{data.habits.length}</p>
              <p>记录数量：{data.records.length}</p>
              <p>时段习惯数量：{data.timeHabits?.length ?? 0}</p>
              <p>时段习惯记录数量：{data.timeHabitRecords?.length ?? 0}</p>
              <p>导出日期：{new Date(data.exportDate).toLocaleString()}</p>
              <p style={{ color: semanticColors.error[mode] }}>注意：导入将覆盖当前数据，请确认是否继续？</p>
            </div>
          ),
          okText: "确认导入",
          cancelText: "取消",
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              // 清空与写入在同一事务中完成，失败时自动回滚
              await dbManager.replaceAll(data);
              message.success("数据导入成功");
              onDataImport();
            } catch {
              message.error("数据导入失败，原有数据未被修改");
            }
          },
        });
      } catch {
        message.error("文件格式错误，请选择正确的备份文件");
      }
    };
    input.click();
  }, [mode, onDataImport]);

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
