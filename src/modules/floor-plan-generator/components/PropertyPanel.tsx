import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, InputNumber, Button, ColorPicker, Divider, Space, Empty } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFloorPlanStore } from '../store/useFloorPlanStore';

const { Option } = Select;

interface PropertyPanelProps {
  selectedElement?: any;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedElement }) => {
  const { houseConfig, updateHouseConfig, updateRoom, updateFurniture, deleteRoom } = useFloorPlanStore();
  const [form] = Form.useForm();
  const [editingRoom, setEditingRoom] = useState<FloorPlan.Room | null>(null);

  // 房间类型选项
  const roomTypeOptions = [
    { value: 'living', label: '客厅' },
    { value: 'bedroom', label: '卧室' },
    { value: 'kitchen', label: '厨房' },
    { value: 'bathroom', label: '卫生间' },
    { value: 'dining', label: '餐厅' },
    { value: 'study', label: '书房' },
    { value: 'storage', label: '储藏室' },
    { value: 'balcony', label: '阳台' },
    { value: 'corridor', label: '走廊' },
  ];

  // 家具类型选项
  const furnitureTypeOptions = [
    { value: 'bed', label: '床' },
    { value: 'sofa', label: '沙发' },
    { value: 'table', label: '桌子' },
    { value: 'chair', label: '椅子' },
    { value: 'cabinet', label: '柜子' },
    { value: 'desk', label: '书桌' },
    { value: 'wardrobe', label: '衣柜' },
    { value: 'tv', label: '电视' },
  ];

  // 当选择元素变化时更新表单
  useEffect(() => {
    if (selectedElement) {
      const { metadata } = selectedElement;
      
      if (metadata.originalType === 'room') {
        const room = houseConfig.rooms.find(r => r.id === metadata.roomId);
        if (room) {
          setEditingRoom(room);
          form.setFieldsValue({
            name: room.name,
            type: room.type,
            width: room.width,
            height: room.height,
            x: room.x,
            y: room.y,
            color: room.color
          });
        }
      } else if (metadata.originalType === 'furniture') {
        const room = houseConfig.rooms.find(r => r.id === metadata.roomId);
        const furniture = room?.furniture.find(f => f.id === metadata.furnitureId);
        if (furniture) {
          form.setFieldsValue({
            name: furniture.name,
            type: furniture.type,
            width: furniture.width,
            height: furniture.height,
            x: furniture.x,
            y: furniture.y,
            rotation: furniture.rotation
          });
        }
      } else if (metadata.originalType === 'door') {
        const room = houseConfig.rooms.find(r => r.id === metadata.roomId);
        const door = room?.doors.find(d => d.id === metadata.doorId);
        if (door) {
          form.setFieldsValue({
            name: door.type === 'double' ? '双开门' : '单开门',
            type: door.type,
            width: door.width,
            position: door.position,
            offset: door.offset
          });
        }
      } else if (metadata.originalType === 'window') {
        const room = houseConfig.rooms.find(r => r.id === metadata.roomId);
        const window = room?.windows.find(w => w.id === metadata.windowId);
        if (window) {
          form.setFieldsValue({
            name: window.type === 'bay' ? '飘窗' : '普通窗',
            type: window.type,
            width: window.width,
            position: window.position,
            offset: window.offset
          });
        }
      }
    } else {
      setEditingRoom(null);
      form.resetFields();
    }
  }, [selectedElement, houseConfig, form]);

  // 处理属性更新
  const handlePropertiesUpdate = (values: any) => {
    if (selectedElement) {
      const { metadata } = selectedElement;
      
      if (metadata.originalType === 'room' && editingRoom) {
        updateRoom(editingRoom.id, values);
      } else if (metadata.originalType === 'furniture') {
        updateFurniture(metadata.roomId, metadata.furnitureId, values);
      } else if (metadata.originalType === 'door') {
        updateDoor(metadata.roomId, metadata.doorId, values);
      } else if (metadata.originalType === 'window') {
        updateWindow(metadata.roomId, metadata.windowId, values);
      }
    }
  };

  // 删除房间
  const handleDeleteRoom = () => {
    if (editingRoom) {
      deleteRoom(editingRoom.id);
      setEditingRoom(null);
      form.resetFields();
    }
  };

  // 如果没有选择元素，显示房屋属性
  if (!selectedElement) {
    return (
      <div className="property-panel">
        {/* 房屋基本信息 */}
        <Card title="房屋属性" size="small" style={{ marginBottom: 16 }}>
          <Form layout="vertical" size="small" form={form}>
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

        {/* 房间统计 */}
        <Card title="房间统计" size="small">
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>房间数量:</span>
              <span>{houseConfig.rooms.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>家具总数:</span>
              <span>{houseConfig.rooms.reduce((total, room) => total + room.furniture.length, 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>门窗总数:</span>
              <span>{houseConfig.rooms.reduce((total, room) => total + room.doors.length + room.windows.length, 0)}</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 根据选择元素类型显示不同的属性面板
  const { metadata } = selectedElement;
  
  if (metadata.originalType === 'room') {
    return (
      <div className="property-panel">
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>房间属性</span>
              <Space>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<EditOutlined />}
                  onClick={() => form.submit()}
                >
                  保存
                </Button>
                <Button 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteRoom}
                >
                  删除
                </Button>
              </Space>
            </div>
          }
          size="small"
        >
          <Form
            layout="vertical"
            size="small"
            form={form}
            onFinish={handlePropertiesUpdate}
          >
            <Form.Item label="房间名称" name="name">
              <Input />
            </Form.Item>
            
            <Form.Item label="房间类型" name="type">
              <Select>
                {roomTypeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Form.Item label="宽度" name="width">
              <InputNumber min={100} max={1000} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="高度" name="height">
              <InputNumber min={100} max={1000} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="X坐标" name="x">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="Y坐标" name="y">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="房间颜色" name="color">
              <ColorPicker />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (metadata.originalType === 'furniture') {
    return (
      <div className="property-panel">
        <Card title="家具属性" size="small">
          <Form
            layout="vertical"
            size="small"
            form={form}
            onFinish={handlePropertiesUpdate}
          >
            <Form.Item label="家具名称" name="name">
              <Input />
            </Form.Item>
            
            <Form.Item label="家具类型" name="type">
              <Select>
                {furnitureTypeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Form.Item label="宽度" name="width">
              <InputNumber min={10} max={500} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="高度" name="height">
              <InputNumber min={10} max={500} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="X坐标" name="x">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="Y坐标" name="y">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="旋转角度" name="rotation">
              <InputNumber min={0} max={360} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (metadata.originalType === 'door') {
    return (
      <div className="property-panel">
        <Card title="门属性" size="small">
          <Form
            layout="vertical"
            size="small"
            form={form}
            onFinish={handlePropertiesUpdate}
          >
            <Form.Item label="门名称" name="name">
              <Input />
            </Form.Item>
            
            <Form.Item label="门类型" name="type">
              <Select>
                <Option value="single">单开门</Option>
                <Option value="double">双开门</Option>
                <Option value="sliding">推拉门</Option>
              </Select>
            </Form.Item>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Form.Item label="宽度" name="width">
              <InputNumber min={50} max={200} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="位置" name="position">
              <Select>
                <Option value="top">顶部</Option>
                <Option value="bottom">底部</Option>
                <Option value="left">左侧</Option>
                <Option value="right">右侧</Option>
              </Select>
            </Form.Item>
            
            <Form.Item label="偏移量" name="offset">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  if (metadata.originalType === 'window') {
    return (
      <div className="property-panel">
        <Card title="窗属性" size="small">
          <Form
            layout="vertical"
            size="small"
            form={form}
            onFinish={handlePropertiesUpdate}
          >
            <Form.Item label="窗名称" name="name">
              <Input />
            </Form.Item>
            
            <Form.Item label="窗类型" name="type">
              <Select>
                <Option value="regular">普通窗</Option>
                <Option value="bay">飘窗</Option>
              </Select>
            </Form.Item>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Form.Item label="宽度" name="width">
              <InputNumber min={50} max={300} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="位置" name="position">
              <Select>
                <Option value="top">顶部</Option>
                <Option value="bottom">底部</Option>
                <Option value="left">左侧</Option>
                <Option value="right">右侧</Option>
              </Select>
            </Form.Item>
            
            <Form.Item label="偏移量" name="offset">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <Card title="属性面板" size="small">
        <Empty 
          description="请选择要编辑的元素"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    </div>
  );
};

export default PropertyPanel;
