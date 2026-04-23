import React, { useState } from 'react';
import { Card, Tabs, Button, Tooltip, Divider } from 'antd';
import { 
  HomeOutlined, 
  TableOutlined, 
  BellOutlined, 
  CoffeeOutlined, 
  CarOutlined,
  SettingOutlined,
  DragOutlined
} from '@ant-design/icons';
import { useFloorPlanStore } from '../store/useFloorPlanStore';
import { roomTemplates } from '../data/templates';

const { TabPane } = Tabs;

// 组件类型定义
interface ComponentItem {
  id: string;
  name: string;
  type: 'room' | 'furniture' | 'door' | 'window';
  icon: React.ReactNode;
  width: number;
  height: number;
  color?: string;
  category: string;
}

const ComponentPanel: React.FC = () => {
  const { addRoom, applyTemplate } = useFloorPlanStore();
  const [draggingItem, setDraggingItem] = useState<ComponentItem | null>(null);

  // 房间组件库
  const roomComponents: ComponentItem[] = [
    { id: 'room-living', name: '客厅', type: 'room', icon: <HomeOutlined />, width: 400, height: 300, color: '#f0f0f0', category: 'rooms' },
    { id: 'room-bedroom', name: '卧室', type: 'room', icon: <BellOutlined />, width: 350, height: 300, color: '#e6f7ff', category: 'rooms' },
    { id: 'room-kitchen', name: '厨房', type: 'room', icon: <CoffeeOutlined />, width: 300, height: 250, color: '#f6ffed', category: 'rooms' },
    { id: 'room-bathroom', name: '卫生间', type: 'room', icon: <SettingOutlined />, width: 200, height: 200, color: '#fff2e8', category: 'rooms' },
    { id: 'room-dining', name: '餐厅', type: 'room', icon: <TableOutlined />, width: 300, height: 250, color: '#f9f0ff', category: 'rooms' },
    { id: 'room-study', name: '书房', type: 'room', icon: <CarOutlined />, width: 250, height: 250, color: '#e8f5ff', category: 'rooms' },
    { id: 'room-balconey', name: '阳台', type: 'room', icon: <HomeOutlined />, width: 150, height: 300, color: '#fff7e6', category: 'rooms' },
    { id: 'room-storage', name: '储藏室', type: 'room', icon: <SettingOutlined />, width: 150, height: 200, color: '#f0f0f0', category: 'rooms' },
  ];

  // 家具组件库
  const furnitureComponents: ComponentItem[] = [
    { id: 'furniture-bed', name: '床', type: 'furniture', icon: <BellOutlined />, width: 150, height: 200, color: '#d9d9d9', category: 'bedroom' },
    { id: 'furniture-sofa', name: '沙发', type: 'furniture', icon: <HomeOutlined />, width: 180, height: 80, color: '#d9d9d9', category: 'living' },
    { id: 'furniture-table', name: '餐桌', type: 'furniture', icon: <TableOutlined />, width: 120, height: 80, color: '#d9d9d9', category: 'dining' },
    { id: 'furniture-chair', name: '椅子', type: 'furniture', icon: <TableOutlined />, width: 40, height: 40, color: '#d9d9d9', category: 'dining' },
    { id: 'furniture-cabinet', name: '柜子', type: 'furniture', icon: <CarOutlined />, width: 60, height: 120, color: '#d9d9d9', category: 'storage' },
    { id: 'furniture-desk', name: '书桌', type: 'furniture', icon: <TableOutlined />, width: 120, height: 60, color: '#d9d9d9', category: 'study' },
    { id: 'furniture-wardrobe', name: '衣柜', type: 'furniture', icon: <CarOutlined />, width: 100, height: 200, color: '#d9d9d9', category: 'bedroom' },
    { id: 'furniture-tv', name: '电视', type: 'furniture', icon: <HomeOutlined />, width: 100, height: 60, color: '#d9d9d9', category: 'living' },
    { id: 'furniture-refrigerator', name: '冰箱', type: 'furniture', icon: <CoffeeOutlined />, width: 60, height: 180, color: '#d9d9d9', category: 'kitchen' },
    { id: 'furniture-stove', name: '灶台', type: 'furniture', icon: <CoffeeOutlined />, width: 80, height: 60, color: '#d9d9d9', category: 'kitchen' },
  ];

  // 门窗组件库
  const doorWindowComponents: ComponentItem[] = [
    { id: 'door-single', name: '单开门', type: 'door', icon: <DragOutlined />, width: 80, height: 20, color: '#8c8c8c', category: 'doors' },
    { id: 'door-double', name: '双开门', type: 'door', icon: <DragOutlined />, width: 120, height: 20, color: '#8c8c8c', category: 'doors' },
    { id: 'door-sliding', name: '推拉门', type: 'door', icon: <DragOutlined />, width: 100, height: 20, color: '#8c8c8c', category: 'doors' },
    { id: 'window-single', name: '单窗', type: 'window', icon: <DragOutlined />, width: 100, height: 15, color: '#91d5ff', category: 'windows' },
    { id: 'window-double', name: '双窗', type: 'window', icon: <DragOutlined />, width: 180, height: 15, color: '#91d5ff', category: 'windows' },
    { id: 'window-bay', name: '飘窗', type: 'window', icon: <DragOutlined />, width: 150, height: 15, color: '#91d5ff', category: 'windows' },
  ];

  // 处理组件拖拽开始
  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    console.log('Drag start for component:', component);
    setDraggingItem(component);
    // 只序列化必要的属性，排除无法序列化的 React 组件
    const serializableComponent = {
      id: component.id,
      name: component.name,
      type: component.type,
      width: component.width,
      height: component.height,
      color: component.color,
      category: component.category
    };
    const componentData = JSON.stringify(serializableComponent);
    console.log('Setting drag data:', componentData);
    e.dataTransfer.setData('text/plain', componentData);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 添加拖拽视觉反馈
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.4';
  };

  // 处理组件拖拽结束
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingItem(null);
    
    // 恢复视觉反馈
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
  };

  // 快速添加房间
  const handleQuickAddRoom = (component: ComponentItem) => {
    const timestamp = new Date().getTime();
    const newRoom: FloorPlan.Room = {
      id: `room-${timestamp}`,
      type: component.name.includes('客厅') ? 'living' : 
            component.name.includes('卧室') ? 'bedroom' :
            component.name.includes('厨房') ? 'kitchen' :
            component.name.includes('卫生间') ? 'bathroom' : 'living',
      name: component.name,
      width: component.width,
      height: component.height,
      x: 100,
      y: 100,
      color: component.color || '#f0f0f0',
      doors: [],
      windows: [],
      furniture: [],
    };
    addRoom(newRoom);
  };

  // 渲染组件列表
  const renderComponentList = (components: ComponentItem[]) => (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
      gap: '8px',
      padding: '8px 0'
    }}>
      {components.map((component) => (
        <Tooltip key={component.id} title={`${component.name} (${component.width}x${component.height})`} placement="right">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'grab',
              transition: 'all 0.2s',
              backgroundColor: draggingItem?.id === component.id ? '#f0f0f0' : '#fff',
              transform: draggingItem?.id === component.id ? 'scale(0.95)' : 'scale(1)'
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, component)}
            onDragEnd={handleDragEnd}
            onClick={() => component.type === 'room' && handleQuickAddRoom(component)}
          >
            <div style={{ 
              fontSize: '20px', 
              color: '#1890ff',
              marginBottom: '4px'
            }}>
              {component.icon}
            </div>
            <div style={{ 
              fontSize: '12px', 
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {component.name}
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: '#666',
              marginTop: '2px'
            }}>
              {component.width}x{component.height}
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <div className="component-panel">
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>组件库</span>
            <Tooltip title="拖拽组件到画布">
              <DragOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
            </Tooltip>
          </div>
        }
        size="small"
        style={{ height: '100%' }}
        bodyStyle={{ padding: '12px', height: 'calc(100% - 57px)', overflow: 'auto' }}
      >
        <Tabs defaultActiveKey="rooms" size="small" style={{ height: '100%' }}>
          <TabPane tab="模板" key="templates">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              {roomTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: 6,
                    padding: 10,
                    background: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{tpl.name}</div>
                    <Button size="small" type="primary" onClick={() => applyTemplate(tpl.config)}>
                      应用
                    </Button>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#666', lineHeight: 1.4 }}>
                    {tpl.description}
                  </div>
                </div>
              ))}
              {roomTemplates.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>暂无模板</div>
              )}
            </div>
          </TabPane>
          <TabPane tab="房间" key="rooms">
            {renderComponentList(roomComponents)}
          </TabPane>
          
          <TabPane tab="家具" key="furniture">
            {renderComponentList(furnitureComponents)}
          </TabPane>
          
          <TabPane tab="门窗" key="doors-windows">
            {renderComponentList(doorWindowComponents)}
          </TabPane>
        </Tabs>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <div style={{ 
          padding: '8px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
            使用说明
          </div>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
            • 拖拽组件到画布添加
            <br />
            • 点击房间组件快速添加
            <br />
            • 在画布中选择元素编辑属性
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ComponentPanel;
