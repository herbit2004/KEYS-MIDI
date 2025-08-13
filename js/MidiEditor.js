// MIDI编辑器模块
export class MidiEditor {
  constructor(audioEngine, keyMapper) {
    this.audioEngine = audioEngine;
    this.keyMapper = keyMapper;
    
    // 获取canvas元素
    this.canvas = document.getElementById('midi-editor');
    this.ctx = this.canvas.getContext('2d');
    this.playhead = document.getElementById('playhead');
    
    // 初始化状态
    this.isRecording = false;
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.pausedTime = 0;
    this.recordedNotes = [];
    this.playheadPosition = 0;
    
    // 预览播放头位置
    this.previewPlayheadPosition = -1; // -1表示不显示预览播放头
    
    // 待设置的播放头位置
    this.pendingPlayheadPosition = undefined;
    
    // 框选功能相关状态
    this.isSelecting = false; // 是否正在进行框选
    this.selectionStartX = 0;
    this.selectionStartY = 0;
    this.selectionEndX = 0;
    this.selectionEndY = 0;
    
    // 延音踏板状态
    this.isSpacePressed = false;
    this.pendingReleases = new Map();
    
    // 悬停状态
    this.hoveredNote = null;
    
    // 编辑状态
    this.isEditing = false;
    this.selectedNotes = [];
    this.clipboard = [];
    this.hasDragged = false; // 是否发生了拖拽
    this.pendingDeselect = null; // 待取消选中的音符
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragType = null; // 'move', 'resize-left', 'resize-right'
    
    // 时间轴缩放
    this.pixelsPerSecond = 100; // 默认100像素/秒
    this.pixelsPerNote = this.canvas.height / 128;
    
    // 录制时调整canvas大小
    this.lastResizeTime = 0;
    
    // 按钮元素
    this.recordButton = document.getElementById('record-button-editor');
    this.playButton = document.getElementById('play-button-editor');
    this.stopButton = document.getElementById('stop-button-editor');
    this.pauseButton = document.getElementById('pause-button-editor');
    this.saveButton = document.getElementById('save-button-editor');
    this.loadButton = document.getElementById('load-button-editor');
    this.loadFileInput = document.getElementById('load-file-input');
    
    // 绑定事件
    this.bindEvents();
    
    // 初始化canvas
    this.canvas.height = 1600;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // 开始动画循环
    this.animate();
  }
  
  // 绑定事件
  bindEvents() {
    // 录制按钮
    this.recordButton.addEventListener('click', () => {
      if (!this.isRecording) {
        this.startRecording();
      }
    });
    
    // 停止按钮
    this.stopButton.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording();
      }
    });
    
    // 播放按钮
    this.playButton.addEventListener('click', () => {
      if (!this.isPlaying) {
        this.play();
      } else if (this.isPlaying) {
        this.pause();
      }
    });
    
    // 暂停按钮
    this.pauseButton.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      }
    });
    
    // 保存按钮
    this.saveButton.addEventListener('click', () => {
      this.saveRecording();
    });
    
    // 导入按钮
    this.loadButton.addEventListener('click', () => {
      this.loadFileInput.click();
    });
    
    // 文件导入输入框
    this.loadFileInput.addEventListener('change', (e) => {
      this.loadRecording(e);
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // 播放头拖拽
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.isRecording && !this.isPlaying) {
        // 重置拖拽标志
        this.hasDragged = false;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 检查是否点击了音符
        const clickedNote = this.getNoteAtPosition(x, y);
        if (clickedNote) {
          // 检查是否按住了Ctrl键
          if (e.ctrlKey) {
            // Ctrl键按下时，切换音符的选中状态
            const index = this.selectedNotes.indexOf(clickedNote);
            if (index > -1) {
              // 如果已选中，则取消选中
              this.selectedNotes.splice(index, 1);
            } else {
              // 如果未选中，则添加到选中列表
              this.selectedNotes.push(clickedNote);
            }
            this.draw();
          } else {
            // 没有按住Ctrl键时，检查是否点击了已选中的音符
            const index = this.selectedNotes.indexOf(clickedNote);
            if (index > -1) {
              // 如果已选中，标记为待取消选中，并设置为编辑状态
              this.pendingDeselect = clickedNote;
              this.selectNote(clickedNote, x, y);
            } else {
              // 否则清空之前的选中并选中当前音符
              this.selectedNotes = [clickedNote];
              this.selectNote(clickedNote, x, y);
            }
          }
        } else {
          // 点击空白区域，如果没有按住Ctrl键则取消所有选中
          if (!e.ctrlKey && this.selectedNotes.length > 0) {
            this.selectedNotes = [];
            this.draw();
          }
          
          // 开始框选或标记播放头位置
          // 默认开始框选，除非是原地点击
          this.isSelecting = true;
          this.selectionStartX = x;
          this.selectionStartY = y;
          this.selectionEndX = x;
          this.selectionEndY = y;
          
          // 初始化自动滚动相关变量
          this.lastMouseX = x;
          this.lastMouseY = y;
          this.scrollTimer = null;
          
          // 标记播放头位置，等待mouseup事件
          this.pendingPlayheadPosition = x;
        }
      }
    });
    
    // 鼠标移动事件
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isEditing && this.selectedNotes.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.dragNote(x, y);
      } else if (this.isSelecting) {
        // 处理框选
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 更新框选结束位置
        this.selectionEndX = x;
        this.selectionEndY = y;
        
        // 设置鼠标样式为十字
        this.canvas.style.cursor = 'crosshair';
        
        // 重置悬停状态
        this.hoveredNote = null;
        
        // 自动滚动逻辑
        this.autoScrollOnSelection(e);
        
        // 重绘
        this.draw();
      } else if (!this.isEditing) {
        // 检测鼠标悬停在音符上
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const hoveredNote = this.getNoteAtPosition(x, y);
        if (hoveredNote) {
          // 设置鼠标样式为手指箭头
          this.canvas.style.cursor = 'pointer';
        } else {
          // 恢复默认鼠标样式
          this.canvas.style.cursor = 'default';
          
          // 更新预览播放头位置
          this.previewPlayheadPosition = x;
          this.draw();
        }
        
        // 保存悬停状态用于绘制
        this.hoveredNote = hoveredNote;
      }
    });
    
    // 鼠标释放事件
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.isSelecting) {
        // 检查是否是原地点击（没有拖拽）
        const deltaX = Math.abs(this.selectionEndX - this.selectionStartX);
        const deltaY = Math.abs(this.selectionEndY - this.selectionStartY);
        
        // 如果是原地点击，则更新播放头位置
        if (deltaX < 5 && deltaY < 5) {
          this.isSelecting = false;
          this.finishDrag();
        } else {
          // 否则完成框选
          this.finishSelection();
        }
      } else {
        this.finishDrag();
      }
      
      // 清理自动滚动定时器
      if (this.scrollTimer) {
        clearInterval(this.scrollTimer);
        this.scrollTimer = null;
      }
    });
    
    // 鼠标离开canvas区域
    this.canvas.addEventListener('mouseleave', () => {
      if (this.isSelecting) {
        // 检查是否是原地点击（没有拖拽）
        const deltaX = Math.abs(this.selectionEndX - this.selectionStartX);
        const deltaY = Math.abs(this.selectionEndY - this.selectionStartY);
        
        // 如果是原地点击，则更新播放头位置
        if (deltaX < 5 && deltaY < 5) {
          this.isSelecting = false;
          this.finishDrag();
        } else {
          // 否则完成框选
          this.finishSelection();
        }
      } else {
        this.finishDrag();
        // 隐藏预览播放头
        this.previewPlayheadPosition = -1;
        this.draw();
      }
      
      // 清理自动滚动定时器
      if (this.scrollTimer) {
        clearInterval(this.scrollTimer);
        this.scrollTimer = null;
      }
    });
    
    // Ctrl+滚轮缩放
    this.canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        const zoomFactor = 1.1;
        
        // 获取鼠标在canvas中的位置
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 计算鼠标位置对应的时间和音高
        const mouseTime = mouseX / this.pixelsPerSecond;
        const mouseNote = 127 - (mouseY / this.pixelsPerNote);
        
        // 根据滚动方向调整缩放比例
        if (delta > 0) {
          this.pixelsPerSecond *= zoomFactor;
        } else {
          this.pixelsPerSecond /= zoomFactor;
        }
        
        // 限制缩放范围
        this.pixelsPerSecond = Math.max(20, Math.min(500, this.pixelsPerSecond));
        
        // 重新计算canvas尺寸
        this.resizeCanvas();
        
        // 调整滚动位置以保持鼠标位置不变
        const newMouseX = mouseTime * this.pixelsPerSecond;
        const newMouseY = (127 - mouseNote) * this.pixelsPerNote;
        
        const container = this.canvas.parentElement;
        container.scrollLeft += (newMouseX - mouseX);
        container.scrollTop += (newMouseY - mouseY);
        
        this.draw();
        
        console.log(`时间轴缩放: ${this.pixelsPerSecond} pixels/second`);
      }
      
      // Ctrl+Shift+滚轮调节高度
    if (e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      const heightChange = 50; // 每次调整50像素
      
      // 获取鼠标在canvas中的位置
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // 计算鼠标位置对应的音高
      const mouseNote = 127 - (mouseY / this.pixelsPerNote);
      
      // 根据滚动方向调整高度
      if (delta > 0) {
        this.canvas.height += heightChange;
      } else {
        this.canvas.height = Math.max(400, this.canvas.height - heightChange); // 最小高度400
      }
      
      // 更新像素比例
      this.pixelsPerNote = this.canvas.height / 128;
      
      // 调整垂直滚动位置以保持鼠标位置不变
      const newMouseY = (127 - mouseNote) * this.pixelsPerNote;
      
      const container = this.canvas.parentElement;
      container.scrollTop += (newMouseY - mouseY);
      
      // 更新播放头位置和高度以适应新的canvas高度
      this.playhead.style.height = `${this.canvas.height}px`;
      this.setPlayheadPosition(this.playheadPosition);
      
      // 重新绘制
      this.draw();
      
      console.log(`画布高度调整: ${this.canvas.height}px`);
    }
    
    // 滚轮调节选中音符的力度
    if (this.selectedNotes.length > 0) {
      // 检查鼠标是否悬停在选中的音符上
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const hoveredNote = this.getNoteAtPosition(mouseX, mouseY);
      if (hoveredNote && this.selectedNotes.includes(hoveredNote)) {
        e.preventDefault();
        
        // 根据滚动方向调整力度
        const delta = e.deltaY > 0 ? -5 : 5; // 每次调整5个单位
        
        // 批量调整所有选中音符的力度
        for (const note of this.selectedNotes) {
          note.velocity = Math.max(0, Math.min(100, note.velocity + delta));
        }
        
        // 重新绘制
        this.draw();
        
        console.log(`调整音符力度: ${this.selectedNotes[0].velocity}`);
      }
    }
    });
    
    // 添加全屏按钮事件监听器
    document.getElementById('fullscreen-button').addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }
  
  // 自动滚动逻辑
  autoScrollOnSelection(e) {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // 保存鼠标位置用于持续滚动
    this.lastMouseX = e.clientX - rect.left;
    this.lastMouseY = e.clientY - rect.top;
    
    // 定义边缘阈值
    const threshold = 80;
    
    // 如果还没有启动滚动定时器，则启动一个
    if (!this.scrollTimer) {
      this.scrollTimer = setInterval(() => {
        if (!this.isSelecting) {
          // 如果不再选择，清除定时器
          clearInterval(this.scrollTimer);
          this.scrollTimer = null;
          return;
        }
        
        const rect = container.getBoundingClientRect();
        const mouseX = this.lastMouseX;
        const mouseY = this.lastMouseY;
        
        let scrolled = false;
        
        // 检查鼠标是否接近边缘
        if (mouseX < threshold) {
          // 向左滚动
          container.scrollLeft -= 10;
          scrolled = true;
        } else if (mouseX > rect.width - threshold) {
          // 向右滚动
          container.scrollLeft += 10;
          scrolled = true;
        }
        
        if (mouseY < threshold) {
          // 向上滚动
          container.scrollTop -= 10;
          scrolled = true;
        } else if (mouseY > rect.height - threshold) {
          // 向下滚动
          container.scrollTop += 10;
          scrolled = true;
        }
        
        // 如果没有滚动，清除定时器
        if (!scrolled) {
          clearInterval(this.scrollTimer);
          this.scrollTimer = null;
        }
      }, 50); // 每50ms检查一次
    }
  }
  
  // 调整canvas尺寸
  resizeCanvas() {
    const container = this.canvas.parentElement;
    // 计算所需的最小宽度，基于播放头位置
    let minWidth = 880; // 默认最小宽度为880px
    
    // 在录制模式下，确保canvas宽度至少能容纳播放头位置，并略微提前以避免死锁
    if (this.isRecording) {
      const playheadTime = this.getPlayheadTime();
      // 略微提前于播放头位置计算canvas宽度，预留2秒的空间
      const playheadWidth = (playheadTime + 2) * this.pixelsPerSecond;
      minWidth = Math.max(minWidth, playheadWidth);
    } else if (this.recordedNotes.length > 0) {
      // 如果有录制的音符，计算容纳所有音符所需的宽度
      let maxEndTime = 0;
      for (const note of this.recordedNotes) {
        if (note.endTime > maxEndTime) {
          maxEndTime = note.endTime;
        }
      }
      // 计算所需宽度，额外增加10%的空间
      const requiredWidth = maxEndTime * this.pixelsPerSecond * 1.1;
      minWidth = Math.max(minWidth, requiredWidth);
    }
    
    // 获取容器的宽度
    const containerWidth = container.clientWidth;
    
    // 确保canvas宽度至少为容器宽度
    minWidth = Math.max(minWidth, containerWidth);
    
    // 确保canvas宽度超出容器宽度至少200px，以触发滚动条
    minWidth = Math.max(minWidth, containerWidth + 200);
    
    const width = minWidth;
    // 使用当前canvas高度，支持动态调整(初始高度1600px)
    const height = this.canvas.height;
    
    // 在宽度或高度发生变化时调整canvas大小
    if (this.canvas.width !== width || this.canvas.height !== height) {
      // 强制设置canvas尺寸
      this.canvas.width = width;
      this.canvas.height = height;
      
      // 更新像素比例
      this.pixelsPerNote = this.canvas.height / 128;
      
      this.draw();
      
      // 强制更新容器的滚动区域
      container.style.overflowX = 'auto';
      container.style.overflowY = 'auto';
    }
  }
  
  // 开始录制
  startRecording() {
    // 如果正在播放，则停止播放
    if (this.isPlaying) {
      this.stop();
    }
    
    this.isRecording = true;
    const playheadTime = this.getPlayheadTime();
    this.startTime = Tone.now() - playheadTime;
    
    // 更新按钮状态
    this.recordButton.style.display = 'none';
    this.stopButton.style.display = 'inline-flex';
    this.playButton.disabled = true;
    
    console.log('开始录制');
  }
  
  // 停止录制
  stopRecording() {
    this.isRecording = false;
    
    // 重新调整canvas大小以适应录制的音符
    this.resizeCanvas();
    
    // 更新按钮状态
    this.recordButton.style.display = 'inline-flex';
    this.stopButton.style.display = 'none';
    this.playButton.disabled = false;
    
    console.log('停止录制');
    console.log('录制的音符:', this.recordedNotes);
  }
  
  // 播放
  play() {
    // 如果正在录制，则停止录制
    if (this.isRecording) {
      this.stopRecording();
    }
    
    // 检查播放头后是否还有音符，如果没有则直接暂停
    const playheadTime = this.getPlayheadTime();
    let hasNotesAfterPlayhead = false;
    
    // 检查是否有音符在播放头之后
    for (const note of this.recordedNotes) {
      if (note.startTime >= playheadTime || (note.startTime < playheadTime && note.endTime > playheadTime)) {
        hasNotesAfterPlayhead = true;
        break;
      }
    }
    
    // 如果播放头后没有音符，则直接暂停
    if (!hasNotesAfterPlayhead) {
      this.pause();
      return;
    }
    
    this.isPlaying = true;
    this.isPaused = false;
    
    if (this.pausedTime > 0) {
      this.startTime = Tone.now() - this.pausedTime;
      this.pausedTime = 0;
    } else {
      this.startTime = Tone.now() - playheadTime;
    }
    
    // 更新按钮状态
    this.playButton.style.display = 'none';
    this.pauseButton.style.display = 'inline-flex';
    this.recordButton.disabled = true;
    
    console.log('开始播放');
  }
  
  // 保存录制内容
  saveRecording() {
    if (this.recordedNotes.length === 0) {
      alert('没有录制内容可保存');
      return;
    }
    
    // 创建要保存的数据对象
    const data = {
      recordedNotes: this.recordedNotes,
      timestamp: new Date().toISOString()
    };
    
    // 将数据转换为JSON字符串
    const jsonData = JSON.stringify(data, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `midi-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('录制内容已保存');
  }
  
  // 导入录制内容
  loadRecording(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // 验证数据格式
        if (data.recordedNotes && Array.isArray(data.recordedNotes)) {
          // 清空当前录制内容
          this.recordedNotes = [];
          
          // 加载新内容
          for (const note of data.recordedNotes) {
            this.recordedNotes.push({
              note: note.note,
              startTime: note.startTime,
              endTime: note.endTime,
              velocity: note.velocity || 100, // 如果没有velocity属性，则默认为100
              played: false
            });
          }
          
          // 清空选中列表
          this.selectedNotes = [];
          
          // 调整canvas尺寸以适应导入的音符
          this.resizeCanvas();
          
          console.log('录制内容已导入');
        } else {
          throw new Error('无效的文件格式');
        }
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败: ' + error.message);
      }
    };
    
    reader.readAsText(file);
    
    // 清空文件输入框
    event.target.value = '';
  }
  
  // 暂停
  pause() {
    this.isPlaying = false;
    this.isPaused = true;
    this.pausedTime = Tone.now() - this.startTime;
    
    // 停止所有正在播放的音符
    for (const noteEntry of this.recordedNotes) {
      if (noteEntry.played) {
        this.audioEngine.stopNote(noteEntry.note);
        noteEntry.played = false;
      }
    }
    
    // 更新按钮状态
    this.playButton.style.display = 'inline-flex';
    this.pauseButton.style.display = 'none';
    this.recordButton.disabled = false;
    
    console.log('暂停播放');
  }
  
  // 停止
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.pausedTime = 0;
    this.setPlayheadPosition(0);
    
    // 重置所有录制音符的播放状态
    for (const noteEntry of this.recordedNotes) {
      noteEntry.played = false;
    }
    
    // 更新按钮状态
    this.playButton.style.display = 'inline-flex';
    this.pauseButton.style.display = 'none';
    this.recordButton.disabled = false;
    
    console.log('停止播放');
  }
  
  // 记录音符按下
  recordNoteOn(note, time) {
    if (this.isRecording) {
      const elapsedTime = time - this.startTime;
      this.recordedNotes.push({
        note: note,
        startTime: elapsedTime,
        endTime: null,
        velocity: 100  // 默认力度值为100
      });
      
      console.log(`记录音符按下: ${note} at ${elapsedTime}s`);
    }
  }
  
  // 记录音符松开
  recordNoteOff(note, time) {
    if (this.isRecording) {
      const elapsedTime = time - this.startTime;
      
      if (this.isSpacePressed) {
        // 查找最近未结束的同音高音符
        for (let i = this.recordedNotes.length - 1; i >= 0; i--) {
          const entry = this.recordedNotes[i];
          if (entry.note === note && entry.endTime === null) {
            this.pendingReleases.set(note, entry);
            console.log(`延音状态保持音符: ${note}`);
            break;
          }
        }
      } else {
        // 正常结束音符
        for (let i = this.recordedNotes.length - 1; i >= 0; i--) {
          const entry = this.recordedNotes[i];
          if (entry.note === note && entry.endTime === null) {
            entry.endTime = elapsedTime;
            console.log(`记录音符松开: ${note} at ${elapsedTime}s`);
            break;
          }
        }
      }
    }
  }

  // 处理键盘事件
  handleKeyDown(e) {
    if (e.code === 'Space') {
      this.isSpacePressed = true;
      console.log('延音踏板激活');
    }
    
    // 处理复制、剪切、粘贴操作
    if (e.ctrlKey || e.metaKey) { // Ctrl键或Cmd键
      switch (e.code) {
        case 'KeyC': // Ctrl+C 复制
          e.preventDefault();
          this.copySelectedNotes();
          break;
        case 'KeyX': // Ctrl+X 剪切
          e.preventDefault();
          this.cutSelectedNotes();
          break;
        case 'KeyV': // Ctrl+V 粘贴
          e.preventDefault();
          this.pasteNotes();
          break;
      }
    }
    
    // 处理选中音符的键盘操作
    if (this.selectedNotes.length > 0) {
      // 阻止方向键的默认行为
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
      
      const step = e.shiftKey ? 0.5 : 0.25; // Shift键控制移动步长
      
      switch (e.code) {
        case 'ArrowUp':
          // 批量向上移动音高
          for (const note of this.selectedNotes) {
            if (note.note < 127) {
              note.note++;
            }
          }
          break;
        case 'ArrowDown':
          // 批量向下移动音高
          for (const note of this.selectedNotes) {
            if (note.note > 0) {
              note.note--;
            }
          }
          break;
        case 'ArrowLeft':
          // 批量向左移动时间
          for (const note of this.selectedNotes) {
            if (note.startTime > 0) {
              note.startTime = Math.max(0, note.startTime - step);
              note.endTime -= step;
            }
          }
          break;
        case 'ArrowRight':
          // 批量向右移动时间
          for (const note of this.selectedNotes) {
            note.startTime += step;
            note.endTime += step;
          }
          break;
        case 'Backspace':
            // 删除所有选中的音符
            this.deleteSelectedNotes();
            break;
      }
      
      this.draw();
    }
  }

  handleKeyUp(e) {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      console.log('延音踏板释放');
      
      // 添加空值检查
      if (this.pendingReleases) {
        this.pendingReleases.forEach((entry, note) => {
          if (entry && entry.endTime === null) {
            entry.endTime = Tone.now() - (this.startTime || 0);
            console.log(`延音释放处理音符: ${note}`);
          }
        });
        this.pendingReleases.clear();
      }
    }
  }
  
  // 移动选中音符的时间位置
  moveSelectedNoteTime(deltaTime) {
    if (!this.selectedNote) return;
    
    // 更新时间
    this.selectedNote.startTime = Math.max(0, this.selectedNote.startTime + deltaTime);
    this.selectedNote.endTime = Math.max(this.selectedNote.startTime, this.selectedNote.endTime + deltaTime);
    
    this.draw();
  }
  
  // 改变选中音符的音高
  moveSelectedNotePitch(deltaPitch) {
    if (!this.selectedNote) return;
    
    // 更新音高
    const newNote = this.selectedNote.note + deltaPitch;
    if (newNote >= 0 && newNote <= 127) {
      this.selectedNote.note = newNote;
      this.draw();
    }
  }
  
  // 删除选中音符
  deleteSelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    // 从录制音符数组中移除所有选中的音符
    for (const note of this.selectedNotes) {
      const index = this.recordedNotes.indexOf(note);
      if (index > -1) {
        this.recordedNotes.splice(index, 1);
      }
    }
    
    // 清空选中列表
    this.selectedNotes = [];
    
    this.draw();
  }
  
  // 复制选中音符
  copySelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    // 将选中的音符信息存储到剪贴板
    this.clipboard = [];
    for (const note of this.selectedNotes) {
      this.clipboard.push({
        note: note.note,
        startTime: note.startTime,
        endTime: note.endTime,
        velocity: note.velocity
      });
    }
    
    console.log('复制音符到剪贴板');
  }
  
  // 剪切选中音符
  cutSelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    // 先复制选中的音符
    this.copySelectedNotes();
    
    // 然后删除选中的音符
    this.deleteSelectedNotes();
    
    console.log('剪切音符到剪贴板');
  }
  
  // 粘贴音符
  pasteNotes() {
    if (!this.clipboard || this.clipboard.length === 0) return;
    
    // 获取当前播放头时间
    const playheadTime = this.getPlayheadTime();
    
    // 找到剪贴板中最早的音符时间
    let earliestTime = Infinity;
    for (const note of this.clipboard) {
      if (note.startTime < earliestTime) {
        earliestTime = note.startTime;
      }
    }
    
    // 计算时间偏移量
    const timeOffset = playheadTime - earliestTime;
    
    // 清空当前选中列表
    this.selectedNotes = [];
    
    // 创建新音符并添加到录制音符数组中
    for (const note of this.clipboard) {
      const newNote = {
        note: note.note,
        startTime: note.startTime + timeOffset,
        endTime: note.endTime + timeOffset,
        velocity: note.velocity
      };
      
      this.recordedNotes.push(newNote);
      
      // 将新音符添加到选中列表
      this.selectedNotes.push(newNote);
    }
    
    this.draw();
    
    console.log('从剪贴板粘贴音符');
  }

  // 处理音符按下时的延音覆盖
  recordNoteOn(note, time) {
    if (this.isRecording) {
      // 检查是否有未结束的延音音符
      if (this.pendingReleases.has(note)) {
        const pendingEntry = this.pendingReleases.get(note);
        if (pendingEntry.endTime === null) {
          pendingEntry.endTime = time - this.startTime;
          console.log(`覆盖延音音符: ${note}`);
          this.pendingReleases.delete(note);
        }
      }

      const elapsedTime = time - this.startTime;
      this.recordedNotes.push({
        note: note,
        startTime: elapsedTime,
        endTime: null,
        velocity: 100  // 默认力度值为100
      });
      
      console.log(`记录音符按下: ${note} at ${elapsedTime}s`);
    }
  }
  
  // 设置播放头位置
  setPlayheadPosition(x) {
    this.playheadPosition = Math.max(0, Math.min(x, this.canvas.width));
    this.playhead.style.left = `${this.playheadPosition}px`;
    
    // 自动滚动以跟随播放头
    this.autoScrollToPlayhead();
    
    // 如果正在暂停，更新pausedTime以反映新的播放头位置
    if (this.isPaused) {
      this.pausedTime = this.playheadPosition / this.pixelsPerSecond;
    }
  }
  
  // 获取播放头位置对应的时间
  getPlayheadTime() {
    return this.playheadPosition / this.pixelsPerSecond;
  }
  
  // 自动滚动以跟随播放头
  autoScrollToPlayhead() {
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    const playheadRect = this.playhead.getBoundingClientRect();
    
    // 计算播放头相对于容器的位置
    const playheadLeftInContainer = playheadRect.left - containerRect.left;
    
    // 如果播放头超出容器右边界，则向右滚动
    if (playheadLeftInContainer > containerRect.width - 50) {
      const scrollAmount = playheadLeftInContainer - (containerRect.width - 50);
      container.scrollLeft += scrollAmount;
    }
    
    // 如果播放头超出容器左边界，则向左滚动
    if (playheadLeftInContainer < 50) {
      const scrollAmount = 50 - playheadLeftInContainer;
      container.scrollLeft -= scrollAmount;
    }
  }
  
  // 获取指定位置的音符
  getNoteAtPosition(x, y) {
    // 将像素坐标转换为时间/音高坐标
    const time = x / this.pixelsPerSecond;
    const note = 127 - Math.floor(y / this.pixelsPerNote);
    
    // 查找匹配的音符
    for (const noteEntry of this.recordedNotes) {
      if (time >= noteEntry.startTime && time <= noteEntry.endTime && note === noteEntry.note) {
        return noteEntry;
      }
    }
    
    return null;
  }
  
  // 选择音符
  selectNote(noteEntry, x, y) {
    this.isEditing = true;
    this.hasDragged = false; // 重置拖拽标志
    
    // 如果该音符尚未被选中，则添加到选中列表
    if (this.selectedNotes.indexOf(noteEntry) === -1) {
      this.selectedNotes.push(noteEntry);
    }
    
    // 计算拖拽偏移量（使用第一个选中的音符作为参考）
    const firstNote = this.selectedNotes[0];
    const noteX = firstNote.startTime * this.pixelsPerSecond;
    const noteWidth = (firstNote.endTime - firstNote.startTime) * this.pixelsPerSecond;
    const noteY = (127 - firstNote.note) * this.pixelsPerNote;
    
    // 如果有多个音符被选中，则默认为整体移动
    if (this.selectedNotes.length > 1) {
      this.dragType = 'move';
      this.dragOffsetX = x - noteX;
      this.dragOffsetY = y - noteY;
    } else {
      // 检查是否点击了边缘（调整长度）
      if (x < noteX + 5) {
        this.dragType = 'resize-left';
      } else if (x > noteX + noteWidth - 5) {
        this.dragType = 'resize-right';
      } else {
        this.dragType = 'move';
        this.dragOffsetX = x - noteX;
        this.dragOffsetY = y - noteY;
      }
    }
    
    this.dragStartX = x;
    this.dragStartY = y;
  }
  
  // 拖拽音符
  dragNote(x, y) {
    if (this.selectedNotes.length === 0 || !this.dragType) return;
    
    // 设置拖拽标志
    this.hasDragged = true;
    
    switch (this.dragType) {
      case 'move':
        this.moveNote(x, y);
        break;
      case 'resize-left':
        this.resizeNoteLeft(x);
        break;
      case 'resize-right':
        this.resizeNoteRight(x);
        break;
    }
    
    this.draw();
  }
  
  // 移动音符
  moveNote(x, y) {
    // 计算第一个选中音符的新时间位置
    const firstNote = this.selectedNotes[0];
    const newStartTime = (x - this.dragOffsetX) / this.pixelsPerSecond;
    const duration = firstNote.endTime - firstNote.startTime;
    const newEndTime = newStartTime + duration;
    
    // 计算时间偏移量
    const timeOffset = newStartTime - firstNote.startTime;
    
    // 计算新的音高偏移量
    const newNote = 127 - Math.floor(y / this.pixelsPerNote);
    const pitchOffset = newNote - firstNote.note;
    
    // 批量更新所有选中音符的位置
    for (const note of this.selectedNotes) {
      // 更新时间
      note.startTime = Math.max(0, note.startTime + timeOffset);
      note.endTime = Math.max(note.startTime, note.endTime + timeOffset);
      
      // 更新音高
      const newPitch = note.note + pitchOffset;
      if (newPitch >= 0 && newPitch <= 127) {
        note.note = newPitch;
      }
    }
  }
  
  // 调整音符左边缘
  resizeNoteLeft(x) {
    // 只调整第一个选中音符的左边缘
    const firstNote = this.selectedNotes[0];
    const newStartTime = x / this.pixelsPerSecond;
    if (newStartTime < firstNote.endTime) {
      const timeOffset = newStartTime - firstNote.startTime;
      
      // 批量调整所有选中音符的开始时间
      for (const note of this.selectedNotes) {
        note.startTime = Math.max(0, note.startTime + timeOffset);
      }
    }
  }
  
  // 调整音符右边缘
  resizeNoteRight(x) {
    // 只调整第一个选中音符的右边缘
    const firstNote = this.selectedNotes[0];
    const newEndTime = x / this.pixelsPerSecond;
    if (newEndTime > firstNote.startTime) {
      const timeOffset = newEndTime - firstNote.endTime;
      
      // 批量调整所有选中音符的结束时间
      for (const note of this.selectedNotes) {
        note.endTime = note.endTime + timeOffset;
      }
    }
  }
  
  // 完成拖拽
  finishDrag() {
    this.isEditing = false;
    
    // 检查是否有待取消选中的音符，并且没有发生拖拽
    if (this.pendingDeselect && !this.hasDragged) {
      const index = this.selectedNotes.indexOf(this.pendingDeselect);
      if (index > -1) {
        this.selectedNotes.splice(index, 1);
      }
    }
    
    // 清空待取消选中的音符
    this.pendingDeselect = null;
    
    // 更新播放头位置，只有在没有发生拖拽的情况下才更新
    if (this.pendingPlayheadPosition !== undefined && !this.hasDragged) {
      this.setPlayheadPosition(this.pendingPlayheadPosition);
    }
    this.pendingPlayheadPosition = undefined;
    
    // 隐藏预览播放头
    this.previewPlayheadPosition = -1;
    
    // 重置框选状态
    this.isSelecting = false;
    
    this.dragType = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    
    this.draw();
  }
  
  // 完成框选
  finishSelection() {
    // 重置框选状态
    this.isSelecting = false;
    
    // 计算框选区域
    const startX = Math.min(this.selectionStartX, this.selectionEndX);
    const startY = Math.min(this.selectionStartY, this.selectionEndY);
    const endX = Math.max(this.selectionStartX, this.selectionEndX);
    const endY = Math.max(this.selectionStartY, this.selectionEndY);
    
    // 将像素坐标转换为时间/音高坐标
    const startTime = startX / this.pixelsPerSecond;
    const endTime = endX / this.pixelsPerSecond;
    const startNote = 127 - Math.floor(endY / this.pixelsPerNote); // 注意：y坐标是反向的
    const endNote = 127 - Math.floor(startY / this.pixelsPerNote);
    
    // 查找框选区域内的音符
    const selectedNotesInRegion = [];
    for (const noteEntry of this.recordedNotes) {
      // 检查音符是否在框选区域内
      // 音符与选择区域有重叠就算选中
      if (noteEntry.note >= startNote && noteEntry.note <= endNote &&
          noteEntry.endTime >= startTime && noteEntry.startTime <= endTime) {
        selectedNotesInRegion.push(noteEntry);
      }
    }
    
    // 将框选区域内的音符添加到选中列表中（不重复添加）
    for (const note of selectedNotesInRegion) {
      if (this.selectedNotes.indexOf(note) === -1) {
        this.selectedNotes.push(note);
      }
    }
    
    // 重置选择框坐标
    this.selectionStartX = 0;
    this.selectionStartY = 0;
    this.selectionEndX = 0;
    this.selectionEndY = 0;
    
    // 恢复默认鼠标样式
    this.canvas.style.cursor = 'default';
    
    // 重绘
    this.draw();
  }
  
  // 动画循环
  animate() {
    // 更新播放头位置
    if (this.isRecording) {
      const elapsedTime = Tone.now() - this.startTime;
      const position = elapsedTime * this.pixelsPerSecond;
      this.setPlayheadPosition(position);
      
      // 定期重新调整canvas大小以适应不断增长的录制内容
      // 每0.1秒检查一次是否需要调整canvas大小，确保更流畅的体验
      if (!this.lastResizeTime || elapsedTime - this.lastResizeTime > 0.1) {
        this.resizeCanvas();
        this.lastResizeTime = elapsedTime;
      }
    } else if (this.isPlaying) {
      const elapsedTime = Tone.now() - this.startTime;
      const position = elapsedTime * this.pixelsPerSecond;
      this.setPlayheadPosition(position);
      
      // 播放录制的音符
      this.playRecordedNotes(elapsedTime);
      
      // 检查是否播放完所有音符，如果是则自动暂停
      if (this.recordedNotes.length > 0) {
        // 找到最后一个音符的结束时间
        let maxEndTime = 0;
        for (const note of this.recordedNotes) {
          if (note.endTime > maxEndTime) {
            maxEndTime = note.endTime;
          }
        }
        
        // 如果播放头已经超过了最后一个音符的结束时间，则暂停
        if (elapsedTime > maxEndTime) {
          this.pause();
        }
      }
    } else if (this.isPaused) {
      // 暂停时保持播放头位置不变
    }
    
    // 绘制
    this.draw();
    
    // 继续动画循环
    requestAnimationFrame(() => this.animate());
  }
  
  // 播放录制的音符
  playRecordedNotes(currentTime) {
    for (const noteEntry of this.recordedNotes) {
      // 检查是否应该播放这个音符
      if (noteEntry.startTime <= currentTime && noteEntry.endTime > currentTime) {
        // 检查是否已经播放过
        if (!noteEntry.played) {
          // 播放音符，使用音符的力度值
          this.audioEngine.playNote(noteEntry.note, noteEntry.velocity);
          noteEntry.played = true;
          console.log(`播放录制的音符: ${noteEntry.note}`);
        }
      } else if (noteEntry.endTime <= currentTime && noteEntry.played) {
        // 停止音符
        this.audioEngine.stopNote(noteEntry.note);
        noteEntry.played = false;
      } else if (noteEntry.startTime > currentTime && noteEntry.played) {
        // 重置未来的音符状态
        noteEntry.played = false;
      }
    }
  }
  
  // 绘制
  draw() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制时间轴和音高线
    this.drawGrid();
    
    // 绘制录制的音符
    this.drawRecordedNotes();
    
    // 绘制悬停音符高光
    if (this.hoveredNote && this.selectedNotes.length === 0) {
      this.drawHoveredNote();
    }
    
    // 绘制选中的音符高亮
    if (this.selectedNotes.length > 0) {
      this.drawSelectedNotes();
    }
    
    // 绘制预览播放头
    if (this.previewPlayheadPosition >= 0) {
      this.ctx.strokeStyle = 'rgba(0, 204, 255, 0.7)'; // 蓝色，半透明 (与UI中其他蓝色#00ccff一致)
      this.ctx.lineWidth = 0.5; // 更细
      this.ctx.beginPath(); // 实线样式
      this.ctx.moveTo(this.previewPlayheadPosition, 0);
      this.ctx.lineTo(this.previewPlayheadPosition, this.canvas.height);
      this.ctx.stroke();
    }
    
    // 绘制选择框
    if (this.isSelecting) {
      const startX = Math.min(this.selectionStartX, this.selectionEndX);
      const startY = Math.min(this.selectionStartY, this.selectionEndY);
      const endX = Math.max(this.selectionStartX, this.selectionEndX);
      const endY = Math.max(this.selectionStartY, this.selectionEndY);
      const width = endX - startX;
      const height = endY - startY;
      
      // 绘制半透明蓝色填充
      this.ctx.fillStyle = 'rgba(0, 204, 255, 0.3)'; // 蓝色，半透明
      this.ctx.fillRect(startX, startY, width, height);
      
      // 绘制边框
      this.ctx.strokeStyle = 'rgba(0, 204, 255, 0.7)'; // 蓝色，半透明
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(startX, startY, width, height);
    }
    
    // 更新信息显示
    this.updateInfoDisplay();
  }
  
  // 将MIDI音符编号转换为乐理表示
  noteNumberToNoteName(noteNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1; // MIDI音符编号从C-1开始
    const noteName = noteNames[noteNumber % 12];
    return `${noteName}${octave}`;
  }
  
  // 更新信息显示
  updateInfoDisplay() {
    // 更新播放头位置和音轨总长信息
    const playheadTime = this.getPlayheadTime();
    
    // 计算音轨总长
    let trackDuration = 0;
    if (this.recordedNotes.length > 0) {
      for (const note of this.recordedNotes) {
        if (note.endTime > trackDuration) {
          trackDuration = note.endTime;
        }
      }
    }
    
    // 更新播放头位置和音轨总长显示
    const playheadPositionElement = document.getElementById('playhead-position');
    const trackDurationElement = document.getElementById('track-duration');
    
    if (playheadPositionElement) {
      playheadPositionElement.textContent = playheadTime.toFixed(2);
    }
    
    if (trackDurationElement) {
      trackDurationElement.textContent = trackDuration.toFixed(2);
    }
    
    // 更新选中音符信息
    const selectedNotesInfoElement = document.getElementById('selected-notes-info');
    
    if (selectedNotesInfoElement) {
      if (this.selectedNotes.length === 0) {
        selectedNotesInfoElement.textContent = '';
      } else if (this.selectedNotes.length === 1) {
        // 显示单个音符的信息
        const note = this.selectedNotes[0];
        const noteName = this.noteNumberToNoteName(note.note);
        selectedNotesInfoElement.textContent = `开始时间: ${note.startTime.toFixed(2)}s, 结束时间: ${note.endTime.toFixed(2)}s, 音高: ${noteName}, 力度: ${note.velocity}`;
      } else {
        // 显示多个音符的统计信息
        let earliestStartTime = Infinity;
        let latestEndTime = -Infinity;
        
        for (const note of this.selectedNotes) {
          if (note.startTime < earliestStartTime) {
            earliestStartTime = note.startTime;
          }
          if (note.endTime > latestEndTime) {
            latestEndTime = note.endTime;
          }
        }
        
        selectedNotesInfoElement.textContent = `选中${this.selectedNotes.length}个音符, 开始时间: ${earliestStartTime.toFixed(2)}s, 结束时间: ${latestEndTime.toFixed(2)}s`;
      }
    }
  }
  
  // 绘制网格
  drawGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 绘制音高背景色
    const noteHeight = height / 128; // MIDI音符范围是0-127
    
    // 用深浅交错的背景色替代每个音高的细线
    for (let i = 0; i < 128; i++) {
      // 交替使用两种背景色
      if (i % 2 === 0) {
        this.ctx.fillStyle = '#1a1a1a'; // 深色
      } else {
        this.ctx.fillStyle = '#121212'; // 浅色
      }
      
      const y = height - (i * noteHeight);
      this.ctx.fillRect(0, y - noteHeight, width, noteHeight);
    }
    
    // 绘制八度线（保留）
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 128; i++) {
      if (i % 12 === 0) { // 每个八度绘制一条线
        const y = height - (i * noteHeight);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
      }
    }
    
    // 绘制时间轴线
    this.ctx.strokeStyle = '#666';  // 更浅的颜色
    this.ctx.lineWidth = 0.5;       // 更细的线
    
    // 每秒绘制一条垂直线
    for (let i = 0; i < width; i += this.pixelsPerSecond) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, height);
      this.ctx.stroke();
    }
    
    // 绘制音高标签
    this.ctx.fillStyle = '#666';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'right';
    for (let i = 0; i < 128; i++) {
      if (i % 12 === 0) { // 每个八度绘制标签
        const y = height - (i * noteHeight) - noteHeight / 2;
        this.ctx.fillText(`C${Math.floor(i/12)-1}`, 30, y + 3);
      }
    }
  }
  
  // 绘制录制的音符
  drawRecordedNotes() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const noteHeight = height / 128;
    
    for (const noteEntry of this.recordedNotes) {
      if (noteEntry.startTime !== null && noteEntry.endTime !== null) {
        const x = noteEntry.startTime * this.pixelsPerSecond;
        const y = height - (noteEntry.note * noteHeight);
        const width = (noteEntry.endTime - noteEntry.startTime) * this.pixelsPerSecond;
        
        // 根据力度值计算填充颜色的透明度
        const alpha = noteEntry.velocity / 100;  // 0-100映射到0-1的透明度
        this.ctx.fillStyle = `rgba(0, 204, 255, ${alpha})`;  // 使用velocity调整透明度
        this.ctx.fillRect(x, y - noteHeight, width, noteHeight);
        
        // 绘制边框
        this.ctx.strokeStyle = '#0088aa';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y - noteHeight, width, noteHeight);
      }
    }
  }
  
  // 绘制选中的音符
  drawSelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const noteHeight = height / 128;
    
    for (const note of this.selectedNotes) {
      const x = note.startTime * this.pixelsPerSecond;
      const y = height - (note.note * noteHeight);
      const widthValue = (note.endTime - note.startTime) * this.pixelsPerSecond;
      
      // 绘制高亮边框
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y - noteHeight, widthValue, noteHeight);
      
      // 绘制调整手柄（只在单个音符被选中时显示）
      if (this.selectedNotes.length === 1) {
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.fillRect(x - 2, y - noteHeight - 2, 4, 4);
        this.ctx.fillRect(x + widthValue - 2, y - noteHeight - 2, 4, 4);
      }
    }
  }
  
  // 绘制悬停音符高光
  drawHoveredNote() {
    if (!this.hoveredNote) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const noteHeight = height / 128;
    
    const x = this.hoveredNote.startTime * this.pixelsPerSecond;
    const y = height - (this.hoveredNote.note * noteHeight);
    const widthValue = (this.hoveredNote.endTime - this.hoveredNote.startTime) * this.pixelsPerSecond;
    
    // 绘制半透明高光
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(x, y - noteHeight, widthValue, noteHeight);
    
    // 绘制高亮边框
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y - noteHeight, widthValue, noteHeight);
  }
  
  // 切换全屏模式
  toggleFullscreen() {
    const editorContainer = document.querySelector('.midi-editor-container');
    const fullscreenButton = document.getElementById('fullscreen-button');
    const fullscreenIcon = fullscreenButton.querySelector('img');
    
    if (!editorContainer.classList.contains('fullscreen')) {
      // 进入全屏模式
      editorContainer.classList.add('fullscreen');
      
      // 添加窗口resize监听
      window.addEventListener('resize', this.handleWindowResize.bind(this));
      
      // 设置全屏状态标识
      this.isEditorFullscreen = true;
      
      // 更新图标为退出全屏
      fullscreenIcon.src = 'icons/fullscreen-exit.svg';
      fullscreenIcon.alt = '退出全屏';
    } else {
      // 退出全屏模式
      editorContainer.classList.remove('fullscreen');
      window.removeEventListener('resize', this.handleWindowResize);
      this.isEditorFullscreen = false;
      
      // 更新图标为进入全屏
      fullscreenIcon.src = 'icons/fullscreen.svg';
      fullscreenIcon.alt = '全屏';
    }
    
    this.resizeCanvas();
    this.draw();
  }
  
  // 处理窗口尺寸变化
  handleWindowResize() {
    this.resizeCanvas();
    this.draw();
  }
}