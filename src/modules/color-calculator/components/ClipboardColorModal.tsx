import { Modal, Typography, Space, Button } from "antd";

const { Text } = Typography;

interface ClipboardColorModalProps {
  open: boolean;
  detectedColor: string | null;
  detectedFormat: string | null;
  onApply: (type: "foreground" | "background") => void;
  onCancel: () => void;
}

const ClipboardColorModal = ({ open, detectedColor, detectedFormat, onApply, onCancel }: ClipboardColorModalProps) => {
  return (
    <Modal
      title="检测到剪贴板颜色"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={400}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 100,
              height: 100,
              backgroundColor: detectedColor || "#000000",
              border: "2px solid #d9d9d9",
              borderRadius: 8,
              margin: "0 auto 16px",
            }}
          />
          <Text code style={{ fontSize: 16 }}>
            {detectedColor}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">格式: {detectedFormat}</Text>
          </div>
        </div>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button type="primary" size="large" onClick={() => onApply("foreground")} block>
            应用为前景色
          </Button>
          <Button size="large" onClick={() => onApply("background")} block>
            应用为背景色
          </Button>
        </Space>
      </Space>
    </Modal>
  );
};

export default ClipboardColorModal;
