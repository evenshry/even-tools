import { useState } from "react";
import { Layout, Tabs } from "antd";
import { BarcodeOutlined, QrcodeOutlined } from "@ant-design/icons";
import ModuleHeader from "@/components/ModuleHeader";
import BarcodeGeneratorPanel from "@/modules/barcode-generator/components/BarcodeGeneratorPanel";
import QrCodeGeneratorPanel from "@/modules/barcode-generator/components/QrCodeGeneratorPanel";
import "@/modules/barcode-generator/BarcodeGenerator.scss";

const { Content } = Layout;

const BarcodeGenerator = () => {
  const [activeTab, setActiveTab] = useState("barcode");

  return (
    <Layout className="barcode-generator">
      <ModuleHeader title="条形码/二维码生成器" />

      <Content className="barcode-generator__content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "barcode",
              label: (
                <span>
                  <BarcodeOutlined />
                  条形码生成
                </span>
              ),
              children: <BarcodeGeneratorPanel />,
            },
            {
              key: "qrcode",
              label: (
                <span>
                  <QrcodeOutlined />
                  二维码生成
                </span>
              ),
              children: <QrCodeGeneratorPanel />,
            },
          ]}
        />
      </Content>
    </Layout>
  );
};

export default BarcodeGenerator;