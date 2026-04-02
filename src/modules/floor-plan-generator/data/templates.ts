// 房屋平面设计模板配置
export const roomTemplates: FloorPlan.Template[] = [
  {
    id: 'apartment-2b1b',
    name: '两室一厅公寓',
    description: '标准的两室一厅公寓布局，包含客厅、两间卧室、厨房和卫生间',
    config: {
      id: 'template-apartment-2b1b',
      name: '两室一厅公寓',
      totalArea: 80,
      rooms: [
        {
          id: 'living-room',
          type: 'living',
          name: '客厅',
          width: 400,
          height: 350,
          x: 100,
          y: 100,
          color: '#f8f9fa',
          doors: [
            { id: 'door1', type: 'single', width: 80, position: 'bottom', offset: 200 }
          ],
          windows: [
            { id: 'window1', type: 'regular', width: 200, position: 'top', offset: 100 }
          ],
          furniture: [
            { id: 'sofa1', type: 'sofa', name: '沙发', width: 180, height: 80, x: 50, y: 150, rotation: 0 },
            { id: 'table1', type: 'table', name: '茶几', width: 100, height: 60, x: 150, y: 200, rotation: 0 }
          ]
        },
        {
          id: 'bedroom-1',
          type: 'bedroom',
          name: '主卧',
          width: 300,
          height: 300,
          x: 100,
          y: 480,
          color: '#e3f2fd',
          doors: [
            { id: 'door2', type: 'single', width: 80, position: 'top', offset: 150 }
          ],
          windows: [
            { id: 'window2', type: 'regular', width: 150, position: 'right', offset: 100 }
          ],
          furniture: [
            { id: 'bed1', type: 'bed', name: '双人床', width: 180, height: 200, x: 60, y: 50, rotation: 0 },
            { id: 'wardrobe1', type: 'wardrobe', name: '衣柜', width: 80, height: 200, x: 160, y: 50, rotation: 0 }
          ]
        },
        {
          id: 'bedroom-2',
          type: 'bedroom',
          name: '次卧',
          width: 250,
          height: 250,
          x: 420,
          y: 480,
          color: '#e8f5e8',
          doors: [
            { id: 'door3', type: 'single', width: 80, position: 'top', offset: 100 }
          ],
          windows: [
            { id: 'window3', type: 'regular', width: 120, position: 'right', offset: 80 }
          ],
          furniture: [
            { id: 'bed2', type: 'bed', name: '单人床', width: 120, height: 200, x: 65, y: 25, rotation: 0 },
            { id: 'desk1', type: 'desk', name: '书桌', width: 100, height: 60, x: 20, y: 150, rotation: 0 }
          ]
        },
        {
          id: 'kitchen',
          type: 'kitchen',
          name: '厨房',
          width: 200,
          height: 250,
          x: 520,
          y: 100,
          color: '#fff3e0',
          doors: [
            { id: 'door4', type: 'single', width: 80, position: 'left', offset: 80 }
          ],
          windows: [
            { id: 'window4', type: 'regular', width: 100, position: 'right', offset: 100 }
          ],
          furniture: [
            { id: 'stove1', type: 'stove', name: '灶台', width: 80, height: 60, x: 20, y: 30, rotation: 0 },
            { id: 'sink1', type: 'sink', name: '水槽', width: 60, height: 40, x: 120, y: 30, rotation: 0 }
          ]
        },
        {
          id: 'bathroom',
          type: 'bathroom',
          name: '卫生间',
          width: 150,
          height: 200,
          x: 520,
          y: 370,
          color: '#e0f2f1',
          doors: [
            { id: 'door5', type: 'single', width: 70, position: 'left', offset: 60 }
          ],
          windows: [],
          furniture: []
        }
      ],
      scale: 1,
      gridSize: 50,
      showGrid: true,
      showDimensions: true,
      showFurniture: true
    }
  },
  {
    id: 'studio-apartment',
    name: '单身公寓',
    description: '紧凑的单间公寓布局，包含卧室区、厨房区和卫生间',
    config: {
      id: 'template-studio',
      name: '单身公寓',
      totalArea: 35,
      rooms: [
        {
          id: 'main-room',
          type: 'living',
          name: '主房间',
          width: 500,
          height: 300,
          x: 100,
          y: 150,
          color: '#f5f5f5',
          doors: [
            { id: 'door1', type: 'single', width: 80, position: 'bottom', offset: 250 }
          ],
          windows: [
            { id: 'window1', type: 'regular', width: 300, position: 'top', offset: 100 }
          ],
          furniture: [
            { id: 'bed1', type: 'bed', name: '床', width: 150, height: 200, x: 50, y: 50, rotation: 0 },
            { id: 'desk1', type: 'desk', name: '书桌', width: 120, height: 60, x: 220, y: 50, rotation: 0 },
            { id: 'sofa1', type: 'sofa', name: '沙发', width: 180, height: 80, x: 300, y: 150, rotation: 0 }
          ]
        },
        {
          id: 'kitchen-area',
          type: 'kitchen',
          name: '厨房区',
          width: 150,
          height: 100,
          x: 620,
          y: 150,
          color: '#fff3e0',
          doors: [],
          windows: [],
          furniture: [
            { id: 'stove1', type: 'stove', name: '灶台', width: 60, height: 40, x: 20, y: 30, rotation: 0 }
          ]
        },
        {
          id: 'bathroom',
          type: 'bathroom',
          name: '卫生间',
          width: 100,
          height: 150,
          x: 620,
          y: 270,
          color: '#e0f2f1',
          doors: [
            { id: 'door2', type: 'single', width: 70, position: 'left', offset: 40 }
          ],
          windows: [],
          furniture: []
        }
      ],
      scale: 1,
      gridSize: 50,
      showGrid: true,
      showDimensions: true,
      showFurniture: true
    }
  },
  {
    id: 'office-layout',
    name: '办公室布局',
    description: '标准的办公空间布局，包含工作区、会议室和休息区',
    config: {
      id: 'template-office',
      name: '办公室布局',
      totalArea: 120,
      rooms: [
        {
          id: 'work-area',
          type: 'study',
          name: '工作区',
          width: 400,
          height: 300,
          x: 100,
          y: 100,
          color: '#f8f9fa',
          doors: [
            { id: 'door1', type: 'single', width: 100, position: 'bottom', offset: 200 }
          ],
          windows: [
            { id: 'window1', type: 'regular', width: 300, position: 'top', offset: 50 }
          ],
          furniture: [
            { id: 'desk1', type: 'desk', name: '办公桌', width: 120, height: 80, x: 50, y: 100, rotation: 0 },
            { id: 'desk2', type: 'desk', name: '办公桌', width: 120, height: 80, x: 200, y: 100, rotation: 0 },
            { id: 'chair1', type: 'chair', name: '办公椅', width: 40, height: 40, x: 80, y: 190, rotation: 0 }
          ]
        },
        {
          id: 'meeting-room',
          type: 'study',
          name: '会议室',
          width: 250,
          height: 200,
          x: 520,
          y: 100,
          color: '#e3f2fd',
          doors: [
            { id: 'door2', type: 'single', width: 80, position: 'left', offset: 80 }
          ],
          windows: [
            { id: 'window2', type: 'regular', width: 150, position: 'right', offset: 50 }
          ],
          furniture: [
            { id: 'table1', type: 'table', name: '会议桌', width: 180, height: 80, x: 35, y: 60, rotation: 0 },
            { id: 'chair2', type: 'chair', name: '会议椅', width: 40, height: 40, x: 20, y: 150, rotation: 0 }
          ]
        },
        {
          id: 'break-area',
          type: 'living',
          name: '休息区',
          width: 200,
          height: 150,
          x: 520,
          y: 320,
          color: '#e8f5e8',
          doors: [],
          windows: [],
          furniture: [
            { id: 'sofa1', type: 'sofa', name: '沙发', width: 120, height: 60, x: 40, y: 45, rotation: 0 },
            { id: 'table2', type: 'table', name: '茶几', width: 60, height: 40, x: 100, y: 55, rotation: 0 }
          ]
        }
      ],
      scale: 1,
      gridSize: 50,
      showGrid: true,
      showDimensions: true,
      showFurniture: true
    }
  }
];