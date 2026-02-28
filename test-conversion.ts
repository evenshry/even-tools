import { convertUnits, formatNumber } from './src/modules/unit-converter/utils/unitConversion';

interface TestCase {
  name: string;
  fromValue: number;
  fromUnitId: string;
  toUnitId: string;
  expectedResult: number;
  tolerance?: number;
}

const testCases: TestCase[] = [
  // 长度单位测试
  { name: '米到千米', fromValue: 1000, fromUnitId: 'm', toUnitId: 'km', expectedResult: 1 },
  { name: '千米到米', fromValue: 1, fromUnitId: 'km', toUnitId: 'm', expectedResult: 1000 },
  { name: '厘米到米', fromValue: 100, fromUnitId: 'cm', toUnitId: 'm', expectedResult: 1 },
  { name: '英寸到厘米', fromValue: 1, fromUnitId: 'in', toUnitId: 'cm', expectedResult: 2.54 },
  { name: '英尺到米', fromValue: 1, fromUnitId: 'ft', toUnitId: 'm', expectedResult: 0.3048 },
  { name: '英里到千米', fromValue: 1, fromUnitId: 'mi', toUnitId: 'km', expectedResult: 1.609344 },
  { name: '海里到千米', fromValue: 1, fromUnitId: 'nmi', toUnitId: 'km', expectedResult: 1.852 },
  { name: '里到米', fromValue: 1, fromUnitId: 'li', toUnitId: 'm', expectedResult: 500 },
  { name: '尺到米', fromValue: 1, fromUnitId: 'chi', toUnitId: 'm', expectedResult: 0.333 },
  { name: '寸到厘米', fromValue: 1, fromUnitId: 'cun', toUnitId: 'cm', expectedResult: 3.33 },

  // 重量单位测试
  { name: '千克到克', fromValue: 1, fromUnitId: 'kg', toUnitId: 'g', expectedResult: 1000 },
  { name: '克到千克', fromValue: 1000, fromUnitId: 'g', toUnitId: 'kg', expectedResult: 1 },
  { name: '吨到千克', fromValue: 1, fromUnitId: 't', toUnitId: 'kg', expectedResult: 1000 },
  { name: '磅到千克', fromValue: 1, fromUnitId: 'lb', toUnitId: 'kg', expectedResult: 0.453592 },
  { name: '盎司到克', fromValue: 1, fromUnitId: 'oz', toUnitId: 'g', expectedResult: 28.3495 },
  { name: '斤到千克', fromValue: 1, fromUnitId: 'jin', toUnitId: 'kg', expectedResult: 0.5 },
  { name: '两到克', fromValue: 1, fromUnitId: 'liang', toUnitId: 'g', expectedResult: 50 },
  { name: '金衡盎司到克', fromValue: 1, fromUnitId: 'troy-oz', toUnitId: 'g', expectedResult: 31.1035 },

  // 面积单位测试
  { name: '平方米到平方千米', fromValue: 1000000, fromUnitId: 'm2', toUnitId: 'km2', expectedResult: 1 },
  { name: '公顷到平方米', fromValue: 1, fromUnitId: 'ha', toUnitId: 'm2', expectedResult: 10000 },
  { name: '英亩到平方米', fromValue: 1, fromUnitId: 'acre', toUnitId: 'm2', expectedResult: 4046.86 },
  { name: '亩到平方米', fromValue: 1, fromUnitId: 'mu', toUnitId: 'm2', expectedResult: 666.667 },
  { name: '平方英尺到平方米', fromValue: 1, fromUnitId: 'sqft', toUnitId: 'm2', expectedResult: 0.092903 },

  // 体积单位测试
  { name: '立方米到升', fromValue: 1, fromUnitId: 'm3', toUnitId: 'l', expectedResult: 1000 },
  { name: '升到毫升', fromValue: 1, fromUnitId: 'l', toUnitId: 'ml', expectedResult: 1000 },
  { name: '加仑到升', fromValue: 1, fromUnitId: 'gal', toUnitId: 'l', expectedResult: 3.78541 },
  { name: '桶到升', fromValue: 1, fromUnitId: 'bbl', toUnitId: 'l', expectedResult: 158.987 },
  { name: '斗到升', fromValue: 1, fromUnitId: 'dou', toUnitId: 'l', expectedResult: 10 },
  { name: '石到升', fromValue: 1, fromUnitId: 'shi', toUnitId: 'l', expectedResult: 100 },

  // 时间单位测试
  { name: '分钟到秒', fromValue: 1, fromUnitId: 'min', toUnitId: 's', expectedResult: 60 },
  { name: '小时到秒', fromValue: 1, fromUnitId: 'h', toUnitId: 's', expectedResult: 3600 },
  { name: '天到小时', fromValue: 1, fromUnitId: 'd', toUnitId: 'h', expectedResult: 24 },
  { name: '周到天', fromValue: 1, fromUnitId: 'w', toUnitId: 'd', expectedResult: 7 },
  { name: '年到天', fromValue: 1, fromUnitId: 'y', toUnitId: 'd', expectedResult: 365.2425 },
  { name: '刻到分钟', fromValue: 1, fromUnitId: 'ke', toUnitId: 'min', expectedResult: 15 },
  { name: '时辰到小时', fromValue: 1, fromUnitId: 'shichen', toUnitId: 'h', expectedResult: 2 },

  // 温度单位测试
  { name: '摄氏度到华氏度', fromValue: 0, fromUnitId: 'celsius', toUnitId: 'fahrenheit', expectedResult: 32 },
  { name: '摄氏度到华氏度2', fromValue: 100, fromUnitId: 'celsius', toUnitId: 'fahrenheit', expectedResult: 212 },
  { name: '华氏度到摄氏度', fromValue: 32, fromUnitId: 'fahrenheit', toUnitId: 'celsius', expectedResult: 0 },
  { name: '摄氏度到开尔文', fromValue: 0, fromUnitId: 'celsius', toUnitId: 'kelvin', expectedResult: 273.15 },
  { name: '开尔文到摄氏度', fromValue: 273.15, fromUnitId: 'kelvin', toUnitId: 'celsius', expectedResult: 0 },
  { name: '摄氏度到兰氏度', fromValue: 0, fromUnitId: 'celsius', toUnitId: 'rankine', expectedResult: 491.67 },
  { name: '兰氏度到摄氏度', fromValue: 491.67, fromUnitId: 'rankine', toUnitId: 'celsius', expectedResult: 0 },
  { name: '华氏度到兰氏度', fromValue: 32, fromUnitId: 'fahrenheit', toUnitId: 'rankine', expectedResult: 491.67 },
  { name: '开尔文到兰氏度', fromValue: 273.15, fromUnitId: 'kelvin', toUnitId: 'rankine', expectedResult: 491.67 },

  // 速度单位测试
  { name: '米每秒到千米每小时', fromValue: 1, fromUnitId: 'mps', toUnitId: 'kph', expectedResult: 3.6 },
  { name: '千米每小时到米每秒', fromValue: 36, fromUnitId: 'kph', toUnitId: 'mps', expectedResult: 10 },
  { name: '英里每小时到千米每小时', fromValue: 1, fromUnitId: 'mph', toUnitId: 'kph', expectedResult: 1.609344 },
  { name: '节到千米每小时', fromValue: 1, fromUnitId: 'kn', toUnitId: 'kph', expectedResult: 1.852 },
  { name: '马赫到米每秒', fromValue: 1, fromUnitId: 'mach', toUnitId: 'mps', expectedResult: 340.29 },

  // 压力单位测试
  { name: '帕斯卡到千帕', fromValue: 1000, fromUnitId: 'pa', toUnitId: 'kpa', expectedResult: 1 },
  { name: '巴到帕斯卡', fromValue: 1, fromUnitId: 'bar', toUnitId: 'pa', expectedResult: 100000 },
  { name: '标准大气压到帕斯卡', fromValue: 1, fromUnitId: 'atm', toUnitId: 'pa', expectedResult: 101325 },
  { name: '磅每平方英寸到帕斯卡', fromValue: 1, fromUnitId: 'psi', toUnitId: 'pa', expectedResult: 6894.76 },
  { name: '毫米汞柱到帕斯卡', fromValue: 1, fromUnitId: 'mmhg', toUnitId: 'pa', expectedResult: 133.322 },

  // 功率单位测试
  { name: '瓦特到千瓦', fromValue: 1000, fromUnitId: 'watt', toUnitId: 'kw', expectedResult: 1 },
  { name: '千瓦到瓦特', fromValue: 1, fromUnitId: 'kw', toUnitId: 'watt', expectedResult: 1000 },
  { name: '马力到瓦特', fromValue: 1, fromUnitId: 'hp', toUnitId: 'watt', expectedResult: 745.7 },
  { name: '公制马力到瓦特', fromValue: 1, fromUnitId: 'hp-metric', toUnitId: 'watt', expectedResult: 735.49875 },

  // 频率单位测试
  { name: '赫兹到千赫兹', fromValue: 1000, fromUnitId: 'hz', toUnitId: 'khz', expectedResult: 1 },
  { name: '千赫兹到兆赫兹', fromValue: 1000, fromUnitId: 'khz', toUnitId: 'mhz', expectedResult: 1 },
  { name: '兆赫兹到吉赫兹', fromValue: 1000, fromUnitId: 'mhz', toUnitId: 'ghz', expectedResult: 1 },

  // 角度单位测试
  { name: '度到弧度', fromValue: 180, fromUnitId: 'deg', toUnitId: 'rad', expectedResult: 3.14159 },
  { name: '弧度到度', fromValue: 1, fromUnitId: 'rad', toUnitId: 'deg', expectedResult: 57.2958 },
  { name: '度到分', fromValue: 1, fromUnitId: 'deg', toUnitId: 'arcmin', expectedResult: 60 },
  { name: '分到秒', fromValue: 1, fromUnitId: 'arcmin', toUnitId: 'arcsec', expectedResult: 60 },

  // 数据存储单位测试（十进制）
  { name: '位到千位', fromValue: 1000, fromUnitId: 'bit', toUnitId: 'kbit', expectedResult: 1 },
  { name: '千位到兆位', fromValue: 1000, fromUnitId: 'kbit', toUnitId: 'mbit', expectedResult: 1 },
  { name: '兆位到吉位', fromValue: 1000, fromUnitId: 'mbit', toUnitId: 'gbit', expectedResult: 1 },
  { name: '吉位到太位', fromValue: 1000, fromUnitId: 'gbit', toUnitId: 'tbit', expectedResult: 1 },
  { name: '字节到位', fromValue: 1, fromUnitId: 'byte', toUnitId: 'bit', expectedResult: 8 },
  { name: '千字节到字节', fromValue: 1, fromUnitId: 'kbyte', toUnitId: 'byte', expectedResult: 1000 },
  { name: '兆字节到千字节', fromValue: 1, fromUnitId: 'mbyte', toUnitId: 'kbyte', expectedResult: 1000 },

  // 数据存储单位测试（二进制）
  { name: '千位(二进制)到位', fromValue: 1, fromUnitId: 'kbit-bin', toUnitId: 'bit', expectedResult: 1024 },
  { name: '兆位(二进制)到千位(二进制)', fromValue: 1, fromUnitId: 'mbit-bin', toUnitId: 'kbit-bin', expectedResult: 1024 },
  { name: '千字节(二进制)到字节', fromValue: 1, fromUnitId: 'kbyte-bin', toUnitId: 'byte', expectedResult: 1024 },
  { name: '兆字节(二进制)到千字节(二进制)', fromValue: 1, fromUnitId: 'mbyte-bin', toUnitId: 'kbyte-bin', expectedResult: 1024 },

  // 数据传输速率单位测试
  { name: '位每秒到千位每秒', fromValue: 1000, fromUnitId: 'bps', toUnitId: 'kbps', expectedResult: 1 },
  { name: '千位每秒到兆位每秒', fromValue: 1000, fromUnitId: 'kbps', toUnitId: 'mbps', expectedResult: 1 },
  { name: '兆位每秒到吉位每秒', fromValue: 1000, fromUnitId: 'mbps', toUnitId: 'gbps', expectedResult: 1 },
  { name: '字节每秒到位每秒', fromValue: 1, fromUnitId: 'byps', toUnitId: 'bps', expectedResult: 8 },
  { name: '千字节每秒到字节每秒', fromValue: 1, fromUnitId: 'kbyps', toUnitId: 'byps', expectedResult: 1000 },

  // 油耗单位测试
  { name: '升每百公里到英里每加仑', fromValue: 10, fromUnitId: 'l-100km', toUnitId: 'mpg-us', expectedResult: 23.5215 },
  { name: '英里每加仑到升每百公里', fromValue: 23.5215, fromUnitId: 'mpg-us', toUnitId: 'l-100km', expectedResult: 10 },
  { name: '升每百公里到公里每升', fromValue: 10, fromUnitId: 'l-100km', toUnitId: 'km-l', expectedResult: 10 },

  // 能量单位测试
  { name: '焦耳到千焦', fromValue: 1000, fromUnitId: 'j', toUnitId: 'kj', expectedResult: 1 },
  { name: '卡路里到焦耳', fromValue: 1, fromUnitId: 'cal', toUnitId: 'j', expectedResult: 4.184 },
  { name: '千卡到焦耳', fromValue: 1, fromUnitId: 'kcal', toUnitId: 'j', expectedResult: 4184 },
  { name: '瓦时到焦耳', fromValue: 1, fromUnitId: 'wh', toUnitId: 'j', expectedResult: 3600 },
  { name: '千瓦时到焦耳', fromValue: 1, fromUnitId: 'kwh', toUnitId: 'j', expectedResult: 3600000 },
  { name: '英热单位到焦耳', fromValue: 1, fromUnitId: 'btu', toUnitId: 'j', expectedResult: 1055.06 },

  // 精度测试 - 极小数值（电子伏特）
  { name: '电子伏特到焦耳', fromValue: 1, fromUnitId: 'ev', toUnitId: 'j', expectedResult: 1.60217e-19, tolerance: 1e-21 },
  { name: '焦耳到电子伏特', fromValue: 1.60217e-19, fromUnitId: 'j', toUnitId: 'ev', expectedResult: 1, tolerance: 0.001 },

  // 精度测试 - 极大数值（天文距离）
  { name: '光年到米', fromValue: 1, fromUnitId: 'ly', toUnitId: 'm', expectedResult: 9.4607304725808e15, tolerance: 1e10 },
  { name: '秒差距到光年', fromValue: 1, fromUnitId: 'pc', toUnitId: 'ly', expectedResult: 3.26156, tolerance: 0.001 },
  { name: '天文单位到千米', fromValue: 1, fromUnitId: 'au', toUnitId: 'km', expectedResult: 149597870.7, tolerance: 100 },

  // 精度测试 - 大数据存储单位
  { name: '拍字节到字节', fromValue: 1, fromUnitId: 'pbyte', toUnitId: 'byte', expectedResult: 1e15, tolerance: 1e10 },
  { name: '艾字节到拍字节', fromValue: 1, fromUnitId: 'ebyte', toUnitId: 'pbyte', expectedResult: 1000, tolerance: 0.1 },
  { name: '拍字节(二进制)到字节', fromValue: 1, fromUnitId: 'pbyte-bin', toUnitId: 'byte', expectedResult: 1.125899906842624e15, tolerance: 1e10 },
  { name: '艾字节(二进制)到拍字节(二进制)', fromValue: 1, fromUnitId: 'ebyte-bin', toUnitId: 'pbyte-bin', expectedResult: 1024, tolerance: 0.1 },
];

function runTests() {
  console.log('='.repeat(80));
  console.log('开始执行单位换算测试');
  console.log('='.repeat(80));
  console.log('');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    const result = convertUnits(testCase.fromValue, testCase.fromUnitId, testCase.toUnitId);
    
    if (!result) {
      console.log(`❌ 测试 ${index + 1} 失败: ${testCase.name}`);
      console.log(`   原因: 换算返回null`);
      console.log('');
      failed++;
      return;
    }

    const tolerance = testCase.tolerance || 0.001;
    const diff = Math.abs(result.result - testCase.expectedResult);
    const isPassed = diff <= tolerance;

    if (isPassed) {
      console.log(`✅ 测试 ${index + 1} 通过: ${testCase.name}`);
      console.log(`   输入: ${testCase.fromValue} ${result.fromUnit.symbol}`);
      console.log(`   输出: ${formatNumber(result.result)} ${result.toUnit.symbol}`);
      console.log(`   期望: ${formatNumber(testCase.expectedResult)} ${result.toUnit.symbol}`);
      console.log(`   差异: ${diff}`);
      console.log('');
      passed++;
    } else {
      console.log(`❌ 测试 ${index + 1} 失败: ${testCase.name}`);
      console.log(`   输入: ${testCase.fromValue} ${result.fromUnit.symbol}`);
      console.log(`   输出: ${formatNumber(result.result)} ${result.toUnit.symbol}`);
      console.log(`   期望: ${formatNumber(testCase.expectedResult)} ${result.toUnit.symbol}`);
      console.log(`   差异: ${diff} (容差: ${tolerance})`);
      console.log(`   公式: ${result.formula}`);
      console.log('');
      failed++;
    }
  });

  console.log('='.repeat(80));
  console.log('测试结果汇总');
  console.log('='.repeat(80));
  console.log(`总测试数: ${testCases.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`通过率: ${((passed / testCases.length) * 100).toFixed(2)}%`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log(`⚠️  有 ${failed} 个测试失败，请检查`);
  }
}

runTests();
