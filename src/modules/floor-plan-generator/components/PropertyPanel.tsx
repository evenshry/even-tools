import React, { useEffect, useRef } from 'react';
import { Card, Form, Input, Select, InputNumber, Button, ColorPicker, Divider, Space, Empty, Switch } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFloorPlanStore } from '../store/useFloorPlanStore';

const { Option } = Select;

// 模块级常量选项（组件内不变化，避免每次渲染重建新数组/对象引用）
const ROOM_TYPE_OPTIONS: { value: FloorPlan.RoomType; label: string }[] = [
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

const FURNITURE_TYPE_OPTIONS: { value: FloorPlan.FurnitureType; label: string }[] = [
  { value: 'bed', label: '床' },
  { value: 'sofa', label: '沙发' },
  { value: 'table', label: '桌子' },
  { value: 'chair', label: '椅子' },
  { value: 'cabinet', label: '柜子' },
  { value: 'desk', label: '书桌' },
  { value: 'wardrobe', label: '衣柜' },
  { value: 'tv', label: '电视' },
  { value: 'refrigerator', label: '冰箱' },
  { value: 'stove', label: '灶台' },
  { value: 'sink', label: '水槽' },
];

const DOOR_TYPE_OPTIONS: { value: FloorPlan.Door['type']; label: string }[] = [
  { value: 'single', label: '单开门' },
  { value: 'double', label: '双开门' },
  { value: 'sliding', label: '推拉门' },
];

const WINDOW_TYPE_OPTIONS: { value: FloorPlan.Window['type']; label: string }[] = [
  { value: 'regular', label: '普通窗' },
  { value: 'bay', label: '飘窗' },
  { value: 'sliding', label: '推拉窗' },
];

const EDGE_POSITION_OPTIONS: { value: FloorPlan.Door['position']; label: string }[] = [
  { value: 'top', label: '顶部' },
  { value: 'bottom', label: '底部' },
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' },
];

const PropertyPanel: React.FC = () => {
  const { houseConfig, updateHouseConfig, updateRoom, updateFurniture, updateDoor, updateWindow, deleteRoom, deleteFurniture, deleteDoor, deleteWindow, selectedElement } = useFloorPlanStore();
  const [form] = Form.useForm();

  // 选中元素身份 key：仅在身份变化时同步表单，避免拖拽过程覆盖用户输入
  const selectionKey = selectedElement
    ? `${selectedElement.originalType}:${selectedElement.roomId}:${selectedElement.furnitureId ?? ''}:${selectedElement.doorId ?? ''}:${selectedElement.windowId ?? ''}`
    : '';
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!selectedElement) {
      form.resetFields();
      lastKeyRef.current = '';
      return;
    }
    if (lastKeyRef.current === selectionKey) return;
    lastKeyRef.current = selectionKey;

    if (selectedElement.originalType === 'room') {
      const room = houseConfig.rooms.find((r) => r.id === selectedElement.roomId);
      if (room) {
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
    } else if (selectedElement.originalType === 'furniture') {
      const room = houseConfig.rooms.find((r) => r.id === selectedElement.roomId);
      const furniture = room?.furniture.find((f) => f.id === selectedElement.furnitureId);
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
    } else if (selectedElement.originalType === 'door') {
      const room = houseConfig.rooms.find((r) => r.id === selectedElement.roomId);
      const door = room?.doors.find((d) => d.id === selectedElement.doorId);
      if (door) {
        form.setFieldsValue({
          type: door.type,
          width: door.width,
          position: door.position,
          offset: door.offset
        });
      }
    } else if (selectedElement.originalType === 'window') {
      const room = houseConfig.rooms.find((r) => r.id === selectedElement.roomId);
      const window = room?.windows.find((w) => w.id === selectedElement.windowId);
      if (window) {
        form.setFieldsValue({
          type: window.type,
          width: window.width,
          position: window.position,
          offset: window.offset
        });
      }
    }
  }, [selectedElement, selectionKey, houseConfig, form]);

  // 处理属性更新
  const handlePropertiesUpdate = (values: any) => {
    if (!selectedElement) return;
    if (selectedElement.originalType === 'room') {
      updateRoom(selectedElement.roomId, values);
    } else if (selectedElement.originalType === 'furniture') {
      updateFurniture(selectedElement.roomId, selectedElement.furnitureId!, values);
    } else if (selectedElement.originalType === 'door') {
      updateDoor(selectedElement.roomId, selectedElement.doorId!, values);
    } else if (selectedElement.originalType === 'window') {
      updateWindow(selectedElement.roomId, selectedElement.windowId!, values);
    }
  };

  // 删除房间
  const handleDeleteRoom = () => {
    if (selectedElement?.originalType === 'room') {
      deleteRoom(selectedElement.roomId);
      form.resetFields();
    }
  };

  // 删除家具
  const handleDeleteFurniture = () => {
    if (selectedElement?.originalType === 'furniture') {
      deleteFurniture(selectedElement.roomId, selectedElement.furnitureId!);
      form.resetFields();
    }
  };

  // 删除门
  const handleDeleteDoor = () => {
    if (selectedElement?.originalType === 'door') {
      deleteDoor(selectedElement.roomId, selectedElement.doorId!);
      form.resetFields();
    }
  };

  // 删除窗
  const handleDeleteWindow = () => {
    if (selectedElement?.originalType === 'window') {
      deleteWindow(selectedElement.roomId, selectedElement.windowId!);
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
            <Form.Item label="总面积 (㎡)" extra="根据房间尺寸自动计算">
              <InputNumber
                value={houseConfig.totalArea}
                disabled
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
            <Divider style={{ margin: '8px 0' }} />
            <Form.Item label="显示网格">
              <Switch
                checked={houseConfig.showGrid}
                onChange={(checked) => updateHouseConfig({ showGrid: checked })}
              />
            </Form.Item>
            <Form.Item label="显示尺寸标注">
              <Switch
                checked={houseConfig.showDimensions}
                onChange={(checked) => updateHouseConfig({ showDimensions: checked })}
              />
            </Form.Item>
            <Form.Item label="显示家具">
              <Switch
                checked={houseConfig.showFurniture}
                onChange={(checked) => updateHouseConfig({ showFurniture: checked })}
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
  if (selectedElement.originalType === 'room') {
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
                {ROOM_TYPE_OPTIONS.map(option => (
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

  if (selectedElement.originalType === 'furniture') {
    return (
      <div className="property-panel">
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>家具属性</span>
              <Space>
                <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => form.submit()}>
                  保存
                </Button>
                <Button danger size="small" icon={<DeleteOutlined />} onClick={handleDeleteFurniture}>
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
            <Form.Item label="家具名称" name="name">
              <Input />
            </Form.Item>
            
            <Form.Item label="家具类型" name="type">
              <Select>
                {FURNITURE_TYPE_OPTIONS.map(option => (
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

  if (selectedElement.originalType === 'door') {
    return (
      <div className="property-panel">
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>门属性</span>
              <Space>
                <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => form.submit()}>
                  保存
                </Button>
                <Button danger size="small" icon={<DeleteOutlined />} onClick={handleDeleteDoor}>
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
            <Form.Item label="门类型" name="type">
              <Select>
                {DOOR_TYPE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Form.Item label="宽度" name="width">
              <InputNumber min={50} max={200} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="位置" name="position">
              <Select>
                {EDGE_POSITION_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
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

  if (selectedElement.originalType === 'window') {
    return (
      <div className="property-panel">
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>窗属性</span>
              <Space>
                <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => form.submit()}>
                  保存
                </Button>
                <Button danger size="small" icon={<DeleteOutlined />} onClick={handleDeleteWindow}>
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
            <Form.Item label="窗类型" name="type">
              <Select>
                {WINDOW_TYPE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <Form.Item label="宽度" name="width">
              <InputNumber min={50} max={300} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item label="位置" name="position">
              <Select>
                {EDGE_POSITION_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
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
