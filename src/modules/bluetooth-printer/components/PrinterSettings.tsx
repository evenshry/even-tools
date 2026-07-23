// 打印机设置面板
// 连接成功后，协议和纸宽会根据设备自动推断；这里允许用户手动微调。

import React from "react";
import { Card, Select, Form, Space, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { usePrinterStore } from "../store/usePrinterStore";

const { Text } = Typography;

const PrinterSettings: React.FC = () => {
  const profile = usePrinterStore((s) => s.profile);
  const setProfile = usePrinterStore((s) => s.setProfile);
  const connectedDevice = usePrinterStore((s) => s.connectedDevice);

  const isConnected = !!connectedDevice;

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          打印机设置
        </Space>
      }
      size="small"
    >
      <Form layout="vertical" size="small">
        <Form.Item label="连接状态：" style={{ marginBottom: 5 }}>
          <Text type={isConnected ? "success" : "secondary"}>
            {isConnected ? `已连接 - ${connectedDevice.name}` : "未连接"}
          </Text>
        </Form.Item>

        <Form.Item label="协议：" style={{ marginBottom: 5 }}>
          <Select
            value={profile.protocol}
            onChange={(protocol) => {
              setProfile({ ...profile, protocol });
            }}
            options={[
              { value: "escpos", label: "ESC/POS (热敏小票)" },
              { value: "tspl", label: "TSPL (标签条码)" },
            ]}
          />
        </Form.Item>

        <Form.Item label="纸张宽度：" style={{ marginBottom: 5 }}>
          <Select
            value={profile.paperWidth}
            onChange={(paperWidth) => {
              setProfile({ ...profile, paperWidth });
            }}
            options={[
              { value: 32, label: "58mm (32列)" },
              { value: 48, label: "80mm (48列)" },
              { value: 72, label: "标签纸 (72mm)" },
            ]}
          />
        </Form.Item>

        {profile.protocol === "tspl" && (
          <Form.Item label="分辨率：" style={{ marginBottom: 5 }}>
            <Select
              value={profile.dpi}
              onChange={(dpi) => {
                setProfile({ ...profile, dpi });
              }}
              options={[
                { value: 203, label: "203 DPI" },
                { value: 300, label: "300 DPI" },
              ]}
            />
          </Form.Item>
        )}

        <Form.Item label="写模式：" style={{ marginBottom: 5 }}>
          <Select
            value={profile.writeMode}
            onChange={(writeMode) => {
              setProfile({ ...profile, writeMode });
            }}
            options={[
              { value: "withResponse", label: "withResponse (等待响应)" },
              { value: "withoutResponse", label: "withoutResponse (快速发送)" },
            ]}
          />
        </Form.Item>

        {connectedDevice?.actualWriteCharacteristicUuid && (
          <Form.Item label="实际写入特征：" style={{ marginBottom: 5 }}>
            <Text code style={{ fontSize: 11, wordBreak: "break-all" }}>
              {connectedDevice.actualWriteCharacteristicUuid}
            </Text>
          </Form.Item>
        )}
      </Form>
    </Card>
  );
};

export default PrinterSettings;
