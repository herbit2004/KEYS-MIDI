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
    
    // 悬停状态
    this.hoveredKey = null;
    
    // 键盘布局参数
    this.whiteKeyHeight = 200;
    this.blackKeyHeight = 120;
    
    // 初始化并监听窗口大小变化
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // 绑定canvas鼠标事件
    this.canvas.addEventListener('mousedown', (event) => this.handleCanvasMouseDown(event));
    this.canvas.addEventListener('mouseup', (event) => this.handleCanvasMouseUp(event));
    this.canvas.addEventListener('mouseleave', (event) => this.handleCanvasMouseUp(event));
    this.canvas.addEventListener('mousemove', (event) => this.handleCanvasMouseMove(event));
    
    // 绑定canvas触摸事件
    this.canvas.addEventListener('touchstart', (event) => this.handleCanvasTouchStart(event), { passive: false });
    this.canvas.addEventListener('touchend', (event) => this.handleCanvasTouchEnd(event), { passive: false });
    this.canvas.addEventListener('touchcancel', (event) => this.handleCanvasTouchEnd(event), { passive: false });
    
    // 存储主控制器引用
    this.mainController = null;
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
      let fillColor = '#ffffff'; // 默认白色
      if (isPressed) {
        fillColor = '#cccccc'; // 按下时的灰色
      } else if (this.hoveredKey === whiteKeys[i]) {
        fillColor = '#f0f0f0'; // 悬停时的浅灰色
      }
      this.ctx.fillStyle = fillColor;
      
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
      let fillColor = '#000000'; // 默认黑色
      if (isPressed) {
        fillColor = '#666666'; // 按下时的深灰色
      } else if (this.hoveredKey === key) {
        fillColor = '#333333'; // 悬停时的深灰色
      }
      this.ctx.fillStyle = fillColor;
      
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
  
  // 设置悬停按键
  setHoveredKey(key) {
    this.hoveredKey = key;
    this.drawKeyboard();
  }

  // 松开按键
  releaseKey(key) {
    this.pressedKeys.delete(key);
    this.drawKeyboard();
  }
  
  // 清除悬停按键
  clearHoveredKey() {
    this.hoveredKey = null;
    this.drawKeyboard();
  }
  
  // 设置主控制器引用
  setMainController(controller) {
    this.mainController = controller;
  }
  
  // 处理canvas鼠标按下事件
  handleCanvasMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    // 考虑页面滚动和边框的影响
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    
    // 获取点击的键
    const key = this.getKeyAtPosition(x, y);
    
    if (key) {
      // 按下按键
      this.pressKey(key);
      
      if (this.mainController) {
        // 触发音符播放
        this.mainController.handleNoteOn(key);
        
        // 如果处于录制模式，记录音符开始
        if (this.mainController.midiEditor && this.mainController.midiEditor.isRecording) {
          const note = this.mainController.keyMapper.getMidiNote(key);
          if (note !== null) {
            this.mainController.midiEditor.recordNoteOn(note, Tone.now());
          }
        }
      }
      
      // 存储当前按下的键
      this.currentPressedKey = key;
    }
  }
  
  // 处理canvas鼠标移动事件
  handleCanvasMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    // 考虑页面滚动和边框的影响
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    
    // 获取悬停的键
    const key = this.getKeyAtPosition(x, y);
    
    // 更新悬停状态
    if (key !== this.hoveredKey) {
      this.clearHoveredKey();
      if (key) {
        this.setHoveredKey(key);
      }
    }
  }
  
  // 处理canvas鼠标抬起事件
  handleCanvasMouseUp(event) {
    if (this.currentPressedKey) {
      // 松开按键
      this.releaseKey(this.currentPressedKey);
      
      if (this.mainController) {
        // 触发音符释放
        this.mainController.handleNoteOff(this.currentPressedKey);
        
        // 如果处于录制模式，记录音符结束
        if (this.mainController.midiEditor && this.mainController.midiEditor.isRecording) {
          const note = this.mainController.keyMapper.getMidiNote(this.currentPressedKey);
          if (note !== null) {
            this.mainController.midiEditor.recordNoteOff(note, Tone.now());
          }
        }
      }
      
      // 清除当前按下的键
      this.currentPressedKey = null;
    }
  }
  
  // 处理canvas触摸开始事件
  handleCanvasTouchStart(event) {
    event.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const touch = event.touches[0];
    // 考虑页面滚动和边框的影响
    const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
    
    // 获取点击的键
    const key = this.getKeyAtPosition(x, y);
    
    if (key) {
      // 按下按键
      this.pressKey(key);
      
      if (this.mainController) {
        // 触发音符播放
        this.mainController.handleNoteOn(key);
        
        // 如果处于录制模式，记录音符开始
        if (this.mainController.midiEditor && this.mainController.midiEditor.isRecording) {
          const note = this.mainController.keyMapper.getMidiNote(key);
          if (note !== null) {
            this.mainController.midiEditor.recordNoteOn(note, Tone.now());
          }
        }
      }
      
      // 存储当前按下的键
      this.currentPressedKey = key;
    }
  }
  
  // 处理canvas触摸结束事件
  handleCanvasTouchEnd(event) {
    if (this.currentPressedKey) {
      // 松开按键
      this.releaseKey(this.currentPressedKey);
      
      if (this.mainController) {
        // 触发音符释放
        this.mainController.handleNoteOff(this.currentPressedKey);
        
        // 如果处于录制模式，记录音符结束
        if (this.mainController.midiEditor && this.mainController.midiEditor.isRecording) {
          const note = this.mainController.keyMapper.getMidiNote(this.currentPressedKey);
          if (note !== null) {
            this.mainController.midiEditor.recordNoteOff(note, Tone.now());
          }
        }
      }
      
      // 清除当前按下的键
      this.currentPressedKey = null;
    }
  }
  
  // 根据坐标获取对应的键
  getKeyAtPosition(x, y) {
    // 先检查是否点击了黑键
    const blackKey = this.getBlackKeyAtPosition(x, y);
    if (blackKey) return blackKey;
    
    // 再检查是否点击了白键
    return this.getWhiteKeyAtPosition(x, y);
  }
  
  // 获取点击的黑键
  getBlackKeyAtPosition(x, y) {
    if (y > this.blackKeyHeight) return null;
    
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
      const keyX = position * this.whiteKeyWidth;
      if (x >= keyX && x <= keyX + this.blackKeyWidth) {
        return key;
      }
    }
    
    return null;
  }
  
  // 获取点击的白键
  getWhiteKeyAtPosition(x, y) {
    if (y > this.whiteKeyHeight) return null;
    
    const whiteKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];
    const keyIndex = Math.floor(x / this.whiteKeyWidth);
    
    if (keyIndex >= 0 && keyIndex < whiteKeys.length) {
      return whiteKeys[keyIndex];
    }
    
    return null;
  }
}