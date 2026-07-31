import React from 'react';
import { Space, Button, Select, Tooltip } from 'antd';
import { DesktopOutlined, TabletOutlined, MobileOutlined, EditOutlined, EyeOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { useCanvasStore } from '../store/useCanvasStore';
import { PreviewMode } from '../types';
import PreviewRenderer from './PreviewRenderer';
import './PreviewArea.scss';

const { Option } = Select;

const PreviewArea: React.FC = () => {
  // 精确订阅：仅订阅预览相关状态，避免 nodes 变化时重渲染工具栏
  const previewMode = useCanvasStore(s => s.previewMode);
  const previewDevice = useCanvasStore(s => s.previewDevice);
  const previewScale = useCanvasStore(s => s.previewScale);
  const rootNodes = useCanvasStore(s => Object.values(s.nodes).filter(node => !node.parentId));
  const setPreviewMode = useCanvasStore(s => s.setPreviewMode);
  const setPreviewDevice = useCanvasStore(s => s.setPreviewDevice);
  const setPreviewScale = useCanvasStore(s => s.setPreviewScale);

  // 渲染预览内容
  const renderPreviewContent = () => {
    if (rootNodes.length === 0) {
      return (
        <div className="preview-content">
          <div className="preview-placeholder">
            <h3>预览模式</h3>
            <p>请先在编辑模式下添加组件</p>
          </div>
        </div>
      );
    }

    return (
      <div className="preview-content">
        <div className="device-frame">
          <div className="device-content">
            {rootNodes.map(node => (
              <PreviewRenderer key={node.id} nodeId={node.id} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="preview-area">
      {/* 预览工具栏 */}
      <div className="preview-toolbar">
        <Space>
          <Button 
            type={previewMode === PreviewMode.EDIT ? "primary" : "default"}
            icon={<EditOutlined />}
            onClick={() => setPreviewMode(PreviewMode.EDIT)}
          >
            编辑模式
          </Button>
          
          <Button 
            type={previewMode === PreviewMode.PREVIEW ? "primary" : "default"}
            icon={<EyeOutlined />}
            onClick={() => setPreviewMode(PreviewMode.PREVIEW)}
          >
            预览模式
          </Button>
          
          <Tooltip title="桌面端">
            <Button 
              type={previewDevice === 'desktop' ? "primary" : "default"}
              icon={<DesktopOutlined />}
              onClick={() => setPreviewDevice('desktop')}
            />
          </Tooltip>
          
          <Tooltip title="平板端">
            <Button 
              type={previewDevice === 'tablet' ? "primary" : "default"}
              icon={<TabletOutlined />}
              onClick={() => setPreviewDevice('tablet')}
            />
          </Tooltip>
          
          <Tooltip title="移动端">
            <Button 
              type={previewDevice === 'mobile' ? "primary" : "default"}
              icon={<MobileOutlined />}
              onClick={() => setPreviewDevice('mobile')}
            />
          </Tooltip>
          
          <Tooltip title="缩小">
            <Button 
              icon={<ZoomOutOutlined />}
              onClick={() => setPreviewScale(Math.max(0.1, previewScale - 0.1))}
            />
          </Tooltip>
          
          <span className="scale-info">{(previewScale * 100).toFixed(0)}%</span>
          
          <Tooltip title="放大">
            <Button 
              icon={<ZoomInOutlined />}
              onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
            />
          </Tooltip>
          
          <Select 
            value={previewScale}
            style={{ width: 100 }}
            onChange={setPreviewScale}
          >
            <Option value={0.5}>50%</Option>
            <Option value={0.75}>75%</Option>
            <Option value={1}>100%</Option>
            <Option value={1.25}>125%</Option>
            <Option value={1.5}>150%</Option>
            <Option value={2}>200%</Option>
          </Select>
        </Space>
      </div>
      
      {/* 预览内容区域 */}
      <div 
        className={`preview-container ${previewDevice}`}
        style={{ transform: `scale(${previewScale})` }}
      >
        {renderPreviewContent()}
      </div>
    </div>
  );
};

export default PreviewArea;