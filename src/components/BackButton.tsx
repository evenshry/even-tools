import React from "react";
import { Button, Tooltip } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import "./BackButton.scss";

// 返回按钮 - 图标按钮，hover 朱红
const BackButton: React.FC = () => {
  return (
    <Link to="/" className="back-button__link">
      <Tooltip title="返回首页">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          className="back-button__btn"
          aria-label="返回首页"
        />
      </Tooltip>
    </Link>
  );
};

export default BackButton;
