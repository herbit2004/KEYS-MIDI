// 可视化管理模块
export class VisualManager {
  constructor(updateStatusCallback) {
    // 获取canvas元素
    this.canvas = document.getElementById('keyboard');
    this.ctx = this.canvas.getContext('2d');
    
    // 状态更新回调
    this.updateStatusCallback = updateStatusCallback;
    
    // 按键状态
    this.pressedKeys = new Set();
    
    // 键盘布局参数
    this.whiteKeyHeight = 200;
    this.blackKeyHeight = 120;
    
    // 初始化并监听窗口大小变化
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  // 更新状态显示
  updateStatus(octaveShift, keyTurning) {
    if (this.updateStatusCallback) {
      this.updateStatusCallback(octaveShift, keyTurning);
    }
  }

  // 调整canvas尺寸
  resizeCanvas() {
    // 设置canvas尺寸为容器宽度
    const container = this.canvas.parentElement;
    const width = container.clientWidth;
    
    // 设置canvas宽度，保持高度比例
    this.canvas.width = width;
    this.canvas.height = 200; // 保持固定高度
    
    // 计算白键宽度
    const whiteKeyCount = 21; // 白键数量
    this.whiteKeyWidth = width / whiteKeyCount;
    this.blackKeyWidth = this.whiteKeyWidth * 0.6; // 黑键宽度为白键的60%
    
    // 重新绘制键盘
    this.drawKeyboard();
  }
  
  // 绘制键盘
  drawKeyboard() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制白键
    this.drawWhiteKeys();
    
    // 绘制黑键
    this.drawBlackKeys();
  }

  // 绘制白键
  drawWhiteKeys() {
    const whiteKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];
    
    for (let i = 0; i < whiteKeys.length; i++) {
      const x = i * this.whiteKeyWidth;
      const y = 0;
      
      // 检查按键是否被按下
      const isPressed = this.pressedKeys.has(whiteKeys[i]);
      
      // 设置填充颜色
      this.ctx.fillStyle = isPressed ? '#cccccc' : '#ffffff';
      
      // 绘制白键
      this.ctx.fillRect(x, y, this.whiteKeyWidth - 2, this.whiteKeyHeight);
      
      // 绘制边框
      this.ctx.strokeStyle = '#000000';
      this.ctx.strokeRect(x, y, this.whiteKeyWidth - 2, this.whiteKeyHeight);
      
      // 绘制按键标识
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(whiteKeys[i], x + this.whiteKeyWidth/2, y + this.whiteKeyHeight - 10);
    }
  }

  // 绘制黑键
  drawBlackKeys() {
    // 黑键位置映射
    const blackKeyPositions = [
      { key: '2', position: 0.7 },
      { key: '3', position: 1.7 },
      { key: '5', position: 3.7 },
      { key: '6', position: 4.7 },
      { key: '7', position: 5.7 },
      { key: '9', position: 7.7 },
      { key: '0', position: 8.7 },
      { key: '=', position: 10.7 },
      { key: 'a', position: 11.7 },
      { key: 's', position: 12.7 },
      { key: 'f', position: 14.7 },
      { key: 'g', position: 15.7 },
      { key: 'j', position: 17.7 },
      { key: 'k', position: 18.7 },
      { key: 'l', position: 19.7 }
    ];
    
    for (const { key, position } of blackKeyPositions) {
      const x = position * this.whiteKeyWidth;
      const y = 0;
      
      // 检查按键是否被按下
      const isPressed = this.pressedKeys.has(key);
      
      // 设置填充颜色
      this.ctx.fillStyle = isPressed ? '#666666' : '#000000';
      
      // 绘制黑键
      this.ctx.fillRect(x, y, this.blackKeyWidth, this.blackKeyHeight);
      
      // 绘制按键标识
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(key, x + this.blackKeyWidth/2, y + this.blackKeyHeight - 10);
    }
  }

  // 按下按键
  pressKey(key) {
    this.pressedKeys.add(key);
    this.drawKeyboard();
  }

  // 松开按键
  releaseKey(key) {
    this.pressedKeys.delete(key);
    this.drawKeyboard();
  }
}