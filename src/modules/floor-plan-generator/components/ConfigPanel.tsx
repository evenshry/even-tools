import React from 'react';
import { Card, Form, Input, InputNumber, Button } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFloorPlanStore } from '../store/useFloorPlanStore';

const ConfigPanel: React.FC = () => {
  const { houseConfig, addRoom, updateHouseConfig } = useFloorPlanStore();



  // 添加新房间
  const handleAddRoom = () => {
    const newRoom: FloorPlan.Room = {
      id: `room-${Date.now()}`,
      type: 'living',
      name: '新房间',
      width: 300,
      height: 300,
      x: 100,
      y: 100,
      color: '#f0f0f0',
      doors: [],
      windows: [],
      furniture: [],
    };
    addRoom(newRoom);
  };

  return (
    <div className="config-panel">
      {/* 房屋基本信息 */}
      <Card title="房屋信息" size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical" size="small">
          <Form.Item label="房屋名称">
            <Input
              value={houseConfig.name}
              onChange={(e) => updateHouseConfig({ name: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="总面积 (㎡)">
            <InputNumber
              min={0}
              value={houseConfig.totalArea}
              onChange={(value) => updateHouseConfig({ totalArea: value || 0 })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 显示设置 */}
      <Card title="显示设置" size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical" size="small">
          <Form.Item label="网格大小">
            <InputNumber
              min={10}
              max={200}
              value={houseConfig.gridSize}
              onChange={(value) => updateHouseConfig({ gridSize: value || 50 })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="缩放比例">
            <InputNumber
              min={0.1}
              max={3}
              step={0.1}
              value={houseConfig.scale}
              onChange={(value) => updateHouseConfig({ scale: value || 1 })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 房间管理 */}
      <Card 
        title="房间管理" 
        size="small"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddRoom}>
            添加房间
          </Button>
        }
      >
        <div className="room-list">
          {houseConfig.rooms.map((room) => (
            <div key={room.id} className="room-item">
              <div className="room-info">
                <div className="room-name">{room.name}</div>
                <div className="room-size">{room.width} × {room.height}</div>
              </div>
              <Button type="text" size="small" icon={<DeleteOutlined />} />
            </div>
          ))}
          {houseConfig.rooms.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
              暂无房间，点击上方按钮添加
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ConfigPanel;