// MIDI编辑器模块
import { MidiExporter } from './MidiExporter.js';

export class MidiEditor {
  constructor(audioEngine, keyMapper, snapToggle) {
    this.audioEngine = audioEngine;
    this.keyMapper = keyMapper;
    this.instrumentConfig = null; // 音色配置引用
    
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
    this.tracks = []; // 按音色分组的轨道数据
    this.playheadPosition = 0;
    
    // BPM相关变量
    this.bpm = 120; // 默认BPM
    this.pixelsPerBeat = 50; // 默认每拍50像素
    
    // 每小节拍数变量
    this.beatsPerMeasure = 4; // 默认每小节4拍
    
    // 节拍器相关变量
    this.isMetronomeEnabled = false; // 节拍器默认关闭
    this.lastBeatTime = 0; // 上一次节拍时间
    this.currentBeat = 0; // 当前节拍计数
    this.metronomeVolume = -25; // 节拍器默认音量为-25dB
    
    // 自动吸附灵敏度变量
    this.snapSensitivity = 0.15; // 默认灵敏度为15%拍
    
    // 自动吸附精度变量
    this.snapPrecision = 1; // 默认精度为1拍
    
    // 计算pixelsPerSecond
    this.pixelsPerSecond = this.calculatePixelsPerSecond();
    
    // 更新BPM显示
    this.updateBpmDisplay();
    
    // 更新每小节拍数显示
    this.updateBeatsPerMeasureDisplay();
    
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
    this.dragReferenceNote = null; // 拖拽基准音符
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragType = null; // 'move', 'resize-left', 'resize-right'
    
    // 音色显示控制
    this.visibleInstruments = new Set(); // 当前显示的音色集合
    this.instrumentVisibilityPanel = null; // 音色显示控制面板
    this.highlightedInstrument = null; // 当前高亮的音色
    this.currentTooltip = null; // 当前显示的工具提示
    this.tooltipHideTimer = null; // 工具提示隐藏定时器
    
    // 鼠标位置跟踪
    this.lastMousePosition = null; // 最后一次鼠标位置
    
    // 自定义对话框状态
    this.isCustomDialogOpen = false; // 自定义对话框是否打开
    
    // 交互禁用标志
    this.keyboardEventsDisabled = false;
    this.globalClickDisabled = false;
    this.contextMenuDisabled = false;
    
    // MIDI导出器
    this.midiExporter = new MidiExporter();
    
    // 时间轴缩放
    this.pixelsPerNote = this.canvas.height / 128;
    this.pixelsPerNote = this.canvas.height / 128;
    
    // 当前正在播放的音符集合，用于高亮显示
    this.activePlayNotes = new Set();
    
    // 初始化音符播放和停止的监听器
    this.setupNotePlaybackListeners();
    
    // 鼠标输入功能状态
    this.isMouseInputEnabled = false; // 鼠标输入功能默认关闭
    this.isMousePressed = false; // 鼠标是否按下
    this.mouseInputStartTime = 0; // 鼠标按下的开始时间
    this.mouseInputNote = null; // 鼠标输入的音符
    this.mouseInputStartPos = null; // 鼠标按下的起始位置
    this.mouseInputStartBeats = 0; // 鼠标按下时的拍数位置
    
    // 录制时调整canvas大小
    this.lastResizeTime = 0;
    
    // 撤回和恢复功能相关状态
    this.history = []; // 历史状态数组
    this.currentHistoryIndex = -1; // 当前历史状态索引
    this.maxHistorySize = 10; // 最大历史记录数量
    this.isUndoRedoOperation = false; // 是否正在进行撤回/恢复操作
    this.lastActionType = null; // 上一次操作类型
    this.lastActionTime = 0; // 上一次操作时间
    this.actionCooldown = 100; // 操作冷却时间（毫秒）
    this.pendingHistorySave = false; // 是否有待保存的历史状态
    
    // 力度调节相关状态
    this.isVelocityAdjusting = false; // 是否正在调节力度
    this.velocityAdjustStartTime = 0; // 力度调节开始时间
    this.velocityAdjustTimeout = null; // 力度调节延迟保存定时器
    
    // 按钮元素
    this.recordButton = document.getElementById('record-button-editor');
    this.playButton = document.getElementById('play-button-editor');
    this.stopButton = document.getElementById('stop-button-editor');
    this.pauseButton = document.getElementById('pause-button-editor');
    this.saveButton = document.getElementById('save-button-editor');
    this.loadButton = document.getElementById('load-button-editor');
    this.loadFileInput = document.getElementById('load-file-input');
    this.mouseInputButton = document.getElementById('mouse-input-button');
    this.mouseInputIcon = this.mouseInputButton ? this.mouseInputButton.querySelector('img') : null;
    
    // 禁用页面中的所有框选
    this.disablePageSelection();
    
    // 处理悬浮容器的拖拽事件
    this.handleFloatingContainers();
    
    // 绑定事件
    this.bindEvents();
    
    // 创建音色显示控制面板
    this.createInstrumentVisibilityPanel();
    
    // 自动吸附功能开关
    this.snapToggle = snapToggle;
    this.isSnapEnabled = false; // 默认关闭自动吸附
    
    // 移除了监听自动吸附开关变化的逻辑，因为现在使用图标点击来切换状态
    
    // 监听节拍器音量滑块变化
    const metronomeVolumeSlider = document.getElementById('metronome-volume');
    const metronomeVolumeValue = document.getElementById('metronome-volume-value');
    if (metronomeVolumeSlider) {
      // 初始化滑块填充百分比
      const min = parseFloat(metronomeVolumeSlider.min);
      const max = parseFloat(metronomeVolumeSlider.max);
      const initialFillPercent = ((this.metronomeVolume - min) / (max - min)) * 100;
      metronomeVolumeSlider.style.setProperty('--fill-percent', `${initialFillPercent}%`);
      
      metronomeVolumeSlider.addEventListener('input', (e) => {
        this.metronomeVolume = parseFloat(e.target.value);
        this.audioEngine.metronomeSynth.volume.value = this.metronomeVolume;
        // 更新显示值
        if (metronomeVolumeValue) {
          metronomeVolumeValue.textContent = `${this.metronomeVolume} dB`;
        }
        // 设置滑块填充百分比
        const fillPercent = ((this.metronomeVolume - min) / (max - min)) * 100;
        metronomeVolumeSlider.style.setProperty('--fill-percent', `${fillPercent}%`);
      });
    }
    
    // 监听自动吸附灵敏度滑块变化
    const snapSensitivitySlider = document.getElementById('snap-sensitivity');
    const snapSensitivityValue = document.getElementById('snap-sensitivity-value');
    if (snapSensitivitySlider) {
      // 初始化滑块填充百分比
      const min = parseFloat(snapSensitivitySlider.min);
      const max = parseFloat(snapSensitivitySlider.max);
      const initialFillPercent = ((parseFloat(snapSensitivitySlider.value) - min) / (max - min)) * 100;
      snapSensitivitySlider.style.setProperty('--fill-percent', `${initialFillPercent}%`);
      
      snapSensitivitySlider.addEventListener('input', (e) => {
        this.snapSensitivity = parseFloat(e.target.value) / 100;
        // 更新显示值
        if (snapSensitivityValue) {
          snapSensitivityValue.textContent = e.target.value;
        }
        // 设置滑块填充百分比
        const fillPercent = ((parseFloat(e.target.value) - min) / (max - min)) * 100;
        snapSensitivitySlider.style.setProperty('--fill-percent', `${fillPercent}%`);
      });
    }
    
    // 监听自动吸附精度滑块变化
    const snapPrecisionSlider = document.getElementById('snap-precision');
    const snapPrecisionValue = document.getElementById('snap-precision-value');
    if (snapPrecisionSlider) {
      // 初始化滑块填充百分比
      const min = parseFloat(snapPrecisionSlider.min);
      const max = parseFloat(snapPrecisionSlider.max);
      const initialFillPercent = ((parseFloat(snapPrecisionSlider.value) - min) / (max - min)) * 100;
      snapPrecisionSlider.style.setProperty('--fill-percent', `${initialFillPercent}%`);
      
      snapPrecisionSlider.addEventListener('input', (e) => {
        this.snapPrecision = parseInt(e.target.value);
        // 更新显示值为分数形式
        if (snapPrecisionValue) {
          snapPrecisionValue.textContent = `1/${e.target.value}`;
        }
        // 设置滑块填充百分比
        const fillPercent = ((parseFloat(e.target.value) - min) / (max - min)) * 100;
        snapPrecisionSlider.style.setProperty('--fill-percent', `${fillPercent}%`);
      });
    }
    
    // 监听一键吸附按钮点击事件
    const snapAllButton = document.getElementById('snap-all-button');
    if (snapAllButton) {
      snapAllButton.addEventListener('click', () => {
        this.snapAllNotes();
      });
    }
    
    // 监听一键吸附时长按钮点击事件
    const snapDurationButton = document.getElementById('snap-duration-button');
    if (snapDurationButton) {
      snapDurationButton.addEventListener('click', () => {
        this.snapDuration();
      });
    }
    
    // 监听鼠标输入按钮点击事件
    if (this.mouseInputButton && this.mouseInputIcon) {
      this.mouseInputButton.addEventListener('click', () => {
        this.isMouseInputEnabled = !this.isMouseInputEnabled;
        if (this.isMouseInputEnabled) {
          this.mouseInputIcon.classList.add('active');
          this.mouseInputButton.classList.add('active');
          // 确保当前选中的乐器在可见乐器集合中
          const currentInstrument = this.audioEngine.currentInstrument;
          if (currentInstrument && !this.visibleInstruments.has(currentInstrument)) {
            this.visibleInstruments.add(currentInstrument);
          }
        } else {
          this.mouseInputIcon.classList.remove('active');
          this.mouseInputButton.classList.remove('active');
        }
      });
    }
    
    // 监听节拍器控制区域的鼠标悬停事件
    const metronomeControl = document.querySelector('.metronome-control');
    const metronomeContainer = document.getElementById('metronome-volume-container');
    const metronomeIcon = document.getElementById('metronome-icon');
    if (metronomeControl && metronomeContainer && metronomeIcon) {
      let metronomeHoverTimeout;
      
      // 切换节拍器状态
      const toggleMetronome = () => {
        this.isMetronomeEnabled = !this.isMetronomeEnabled;
        if (this.isMetronomeEnabled) {
          metronomeIcon.classList.add('active');
        } else {
          metronomeIcon.classList.remove('active');
        }
      };
      
      // 点击节拍器图标切换状态
      metronomeIcon.addEventListener('click', toggleMetronome);
      
      // 鼠标进入节拍器控制区域
        metronomeControl.addEventListener('mouseenter', () => {
          clearTimeout(metronomeHoverTimeout);
          
          // 先隐藏其他容器
          const snapContainer = document.getElementById('snap-sensitivity-container');
          if (snapContainer && snapContainer.style.display === 'block') {
            snapContainer.style.opacity = '0';
            snapContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              snapContainer.style.display = 'none';
            }, 200);
          }
          
          const exportContainer = document.getElementById('export-options-container');
          if (exportContainer && exportContainer.style.display === 'block') {
            exportContainer.style.opacity = '0';
            exportContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              exportContainer.style.display = 'none';
            }, 200);
          }
          
          // 显示节拍器滑块容器
          metronomeContainer.style.display = 'block';
          metronomeContainer.style.opacity = '0';
          metronomeContainer.style.transition = 'opacity 0.2s ease';
          // 强制重绘以确保动画效果
          metronomeContainer.offsetHeight;
          metronomeContainer.style.opacity = '1';
        });
      
      // 鼠标离开节拍器控制区域
      metronomeControl.addEventListener('mouseleave', () => {
        metronomeHoverTimeout = setTimeout(() => {
          if (metronomeContainer.style.display === 'block') {
            metronomeContainer.style.opacity = '0';
            metronomeContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              metronomeContainer.style.display = 'none';
            }, 200);
          }
        }, 200);
      });
      
      // 鼠标进入节拍器滑块容器
      metronomeContainer.addEventListener('mouseenter', () => {
        clearTimeout(metronomeHoverTimeout);
      });
      
      // 鼠标离开节拍器滑块容器
      metronomeContainer.addEventListener('mouseleave', () => {
        metronomeHoverTimeout = setTimeout(() => {
          if (metronomeContainer.style.display === 'block') {
            metronomeContainer.style.opacity = '0';
            metronomeContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              metronomeContainer.style.display = 'none';
            }, 200);
          }
        }, 200);
      });
    }
    
    // 监听自动吸附控制区域的鼠标悬停事件
    const snapControl = document.querySelector('.snap-control');
    const snapContainer = document.getElementById('snap-sensitivity-container');
    const snapIcon = document.getElementById('snap-icon');
    if (snapControl && snapContainer && snapIcon) {
      let snapHoverTimeout;
      
      // 切换自动吸附状态
      const toggleSnap = () => {
        this.isSnapEnabled = !this.isSnapEnabled;
        if (this.isSnapEnabled) {
          snapIcon.classList.add('active');
        } else {
          snapIcon.classList.remove('active');
        }
      };
      
      // 点击自动吸附图标切换状态
      snapIcon.addEventListener('click', toggleSnap);
      
      // 鼠标进入自动吸附控制区域
        snapControl.addEventListener('mouseenter', () => {
          clearTimeout(snapHoverTimeout);
          
          // 先隐藏其他容器
          const metronomeContainer = document.getElementById('metronome-volume-container');
          if (metronomeContainer && metronomeContainer.style.display === 'block') {
            metronomeContainer.style.opacity = '0';
            metronomeContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              metronomeContainer.style.display = 'none';
            }, 200);
          }
          
          const exportContainer = document.getElementById('export-options-container');
          if (exportContainer && exportContainer.style.display === 'block') {
            exportContainer.style.opacity = '0';
            exportContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              exportContainer.style.display = 'none';
            }, 200);
          }
          
          // 显示自动吸附滑块容器
          snapContainer.style.display = 'block';
          snapContainer.style.opacity = '0';
          snapContainer.style.transition = 'opacity 0.2s ease';
          // 强制重绘以确保动画效果
        snapContainer.offsetHeight;
        snapContainer.style.opacity = '1';
      });
      
      // 鼠标离开自动吸附控制区域
      snapControl.addEventListener('mouseleave', () => {
        snapHoverTimeout = setTimeout(() => {
          if (snapContainer.style.display === 'block') {
            snapContainer.style.opacity = '0';
            snapContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              snapContainer.style.display = 'none';
            }, 200);
          }
        }, 200);
      });
      
      // 鼠标进入自动吸附滑块容器
      snapContainer.addEventListener('mouseenter', () => {
        clearTimeout(snapHoverTimeout);
      });
      
      // 鼠标离开自动吸附滑块容器
      snapContainer.addEventListener('mouseleave', () => {
        snapHoverTimeout = setTimeout(() => {
          if (snapContainer.style.display === 'block') {
            snapContainer.style.opacity = '0';
            snapContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              snapContainer.style.display = 'none';
            }, 200);
          }
        }, 200);
      });
    }
    
    // 移除了点击其他地方关闭滑块容器的事件监听器，因为现在使用鼠标悬停机制
    
    // 初始化canvas
    this.canvas.height = 1600;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // 创建右键菜单
    this.initContextMenu();

    // 开始动画循环
    this.animate();
    
    // 保存初始状态
    this.saveToHistory('initial');
  }
  
  // 设置音符播放和停止的监听器
  setupNotePlaybackListeners() {
    // 保存原始的playNote和stopNote方法
    const originalPlayNote = this.audioEngine.playNote.bind(this.audioEngine);
    const originalStopNote = this.audioEngine.stopNote.bind(this.audioEngine);
    
    // 重写playNote方法，添加高亮逻辑
    this.audioEngine.playNote = (note, velocity = 0.8, allowRetrigger = false, instrumentId = null) => {
      // 添加到活动音符集合
      this.activePlayNotes.add(note);
      // 触发重绘
      this.draw();
      // 调用原始方法，传递所有参数
      originalPlayNote(note, velocity, allowRetrigger, instrumentId);
    };
    
    // 重写stopNote方法，移除高亮
    this.audioEngine.stopNote = (note, instrumentId = null) => {
      // 从活动音符集合中移除
      this.activePlayNotes.delete(note);
      // 触发重绘
      this.draw();
      // 调用原始方法
      originalStopNote(note, instrumentId);
    };
  }
  
  // 计算pixelsPerSecond
  calculatePixelsPerSecond() {
    // 1分钟 = 60秒
    // 1拍 = 60秒 / BPM
    // pixelsPerSecond = pixelsPerBeat / (60 / BPM) = pixelsPerBeat * BPM / 60
    return this.pixelsPerBeat * this.bpm / 60;
  }
  
  // 计算pixelsPerBeat
  calculatePixelsPerBeat() {
    // 1分钟 = 60秒
    // 1拍 = 60秒 / BPM
    // pixelsPerBeat = pixelsPerSecond * (60 / BPM) = pixelsPerSecond * 60 / BPM
    return this.pixelsPerSecond * 60 / this.bpm;
  }
  
  // 更新BPM显示
  updateBpmDisplay() {
    const bpmDisplay = document.getElementById('bpm-display');
    if (bpmDisplay) {
      bpmDisplay.textContent = this.bpm;
    }
  }
  
  // 更新每小节拍数显示
  updateBeatsPerMeasureDisplay() {
    const beatsPerMeasureInput = document.getElementById('beats-per-measure-input');
    if (beatsPerMeasureInput) {
      beatsPerMeasureInput.value = this.beatsPerMeasure;
    }
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
    
    // 导出控制区域交互逻辑
    const exportControl = document.querySelector('.export-control');
    const exportContainer = document.getElementById('export-options-container');
    const saveButton = document.getElementById('save-button-editor');
    
    if (exportControl && exportContainer && saveButton) {
      let exportHoverTimeout;
      
      // 鼠标进入导出控制区域
      exportControl.addEventListener('mouseenter', () => {
        clearTimeout(exportHoverTimeout);
        
        // 先隐藏其他容器
        const metronomeContainer = document.getElementById('metronome-volume-container');
        const snapContainer = document.getElementById('snap-sensitivity-container');
        
        if (metronomeContainer && metronomeContainer.style.display === 'block') {
          metronomeContainer.style.opacity = '0';
          metronomeContainer.style.transition = 'opacity 0.2s ease';
          setTimeout(() => {
            metronomeContainer.style.display = 'none';
          }, 200);
        }
        
        if (snapContainer && snapContainer.style.display === 'block') {
          snapContainer.style.opacity = '0';
          snapContainer.style.transition = 'opacity 0.2s ease';
          setTimeout(() => {
            snapContainer.style.display = 'none';
          }, 200);
        }
        
        // 显示导出菜单容器
        exportContainer.style.display = 'block';
        exportContainer.style.opacity = '0';
        exportContainer.style.transition = 'opacity 0.2s ease';
        // 强制重绘以确保动画效果
        exportContainer.offsetHeight;
        exportContainer.style.opacity = '1';
      });
      
      // 鼠标离开导出控制区域
      exportControl.addEventListener('mouseleave', () => {
        exportHoverTimeout = setTimeout(() => {
          if (exportContainer.style.display === 'block') {
            exportContainer.style.opacity = '0';
            exportContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              exportContainer.style.display = 'none';
            }, 200);
          }
        }, 200);
      });
      
      // 鼠标进入导出菜单容器
      exportContainer.addEventListener('mouseenter', () => {
        clearTimeout(exportHoverTimeout);
      });
      
      // 鼠标离开导出菜单容器
      exportContainer.addEventListener('mouseleave', () => {
        exportHoverTimeout = setTimeout(() => {
          if (exportContainer.style.display === 'block') {
            exportContainer.style.opacity = '0';
            exportContainer.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
              exportContainer.style.display = 'none';
            }, 200);
          }
        }, 200);
      });
    }
    
    // 导出JSON按钮
    const exportJsonButton = document.getElementById('export-json-button');
    if (exportJsonButton) {
      exportJsonButton.addEventListener('click', () => {
        this.saveRecording();
        // 隐藏导出菜单
        const exportContainer = document.getElementById('export-options-container');
        if (exportContainer) {
          exportContainer.style.display = 'none';
        }
      });
    }
    
    // 导出MIDI按钮
    const exportMidiButton = document.getElementById('export-midi-button');
    if (exportMidiButton) {
      exportMidiButton.addEventListener('click', () => {
        this.exportMidi();
        // 隐藏导出菜单
        const exportContainer = document.getElementById('export-options-container');
        if (exportContainer) {
          exportContainer.style.display = 'none';
        }
      });
    }
    
    // 导入按钮
    this.loadButton.addEventListener('click', () => {
      this.loadFileInput.click();
    });
    
    // 文件导入输入框
    this.loadFileInput.addEventListener('change', (e) => {
      this.loadRecording(e);
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (!this.keyboardEventsDisabled) {
        this.handleKeyDown(e);
      }
    });
    document.addEventListener('keyup', (e) => {
      if (!this.keyboardEventsDisabled) {
        this.handleKeyUp(e);
      }
    });
    
    // 全局点击事件，用于取消选中音符
    document.addEventListener('click', (e) => {
      if (!this.globalClickDisabled) {
        // 检查点击是否发生在canvas外部
        if (!this.canvas.contains(e.target) && this.selectedNotes.length > 0) {
          // 取消选中所有音符
          this.selectedNotes = [];
          this.draw();
          this.updateInfoDisplay();
        }
      }
    });
    
    // 点击canvas内部时关闭滑块容器与右键菜单
    this.canvas.addEventListener('click', (e) => {
      if (!this.contextMenuDisabled) {
        // 先关闭右键菜单
        if (this.contextMenu && this.contextMenu.style.display === 'block') {
          this.hideContextMenu();
        }
        
        const metronomeContainer = document.getElementById('metronome-volume-container');
        const snapContainer = document.getElementById('snap-sensitivity-container');
        
        // 关闭节拍器滑块容器
        if (metronomeContainer && metronomeContainer.style.display === 'block') {
          metronomeContainer.style.opacity = '0';
          metronomeContainer.style.transition = 'opacity 0.2s ease';
          setTimeout(() => {
            metronomeContainer.style.display = 'none';
          }, 200);
        }
        
        // 关闭自动吸附滑块容器
        if (snapContainer && snapContainer.style.display === 'block') {
          snapContainer.style.opacity = '0';
          snapContainer.style.transition = 'opacity 0.2s ease';
          setTimeout(() => {
            snapContainer.style.display = 'none';
          }, 200);
        }
        
        // 阻止事件冒泡，避免触发全局点击事件
        e.stopPropagation();
      }
    });
    
    // 鼠标按下事件
    this.canvas.addEventListener('mousedown', (e) => {
      // 右键不参与常规交互（交给自定义菜单）
      if (e.button === 2) return;
      if (this.isRecording || this.isPlaying) return;
      
      const pos = this.getMousePosition(e);
      
      // 重置拖拽标志
      this.hasDragged = false;
      
      // 检查是否点击了音符
      const clickedNoteRef = this.getNoteAtPosition(pos.x, pos.y);
      
      if (clickedNoteRef) {
        // 点击音符：处理音符选择/编辑
        this.handleNoteClick(clickedNoteRef, pos, e.ctrlKey);
      } else if (this.isMouseInputEnabled) {
        // 鼠标输入功能开启：开始创建音符
        this.startMouseInputNote(pos);
      } else {
        // 点击空白区域：开始框选
        this.startSelection(pos, e.ctrlKey);
      }
    });
    
    // 鼠标移动事件
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getMousePosition(e);
      this.lastMousePosition = pos; // 保存鼠标位置
      
      // 检查鼠标输入模式下是否需要转为选择框
      if (this.isMouseInputEnabled && this.isMousePressed) {
        this.checkMouseMoveForInputMode(pos);
      }
      
      if (this.isEditing && this.selectedNotes.length > 0) {
        // 拖拽音符
        this.dragNote(pos.x, pos.y);
      } else if (this.isSelecting) {
        // 处理框选
        this.updateSelection(pos);
      } else {
        // 处理悬停
        this.updateHover(pos);
      }
      
      // 更新信息显示
      this.updateInfoDisplay();
    });
    
    // 全局鼠标移动事件（处理从悬浮元素开始的拖拽）
    document.addEventListener('mousemove', (e) => {
      if (this.isSelecting) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const pos = {
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top
        };
        
        // 更新框选状态
        this.updateSelection(pos);
      }
    });
    
    // 鼠标释放事件（只在canvas内）
    this.canvas.addEventListener('mouseup', (e) => {
      this.handleMouseUp(e);
    });
    
    // 全局鼠标释放事件（处理从悬浮元素开始的拖拽）
    document.addEventListener('mouseup', (e) => {
      if (this.isMouseInputEnabled && this.isMousePressed) {
        // 鼠标输入功能开启：结束音符创建
        this.endMouseInputNote();
      }
      this.handleMouseUp(e);
    });
    
    // 鼠标离开canvas区域
    this.canvas.addEventListener('mouseleave', () => {
      // 重置悬停状态
      this.hoveredNote = null;
      this.previewPlayheadPosition = -1;
      this.lastMousePosition = null; // 清空鼠标位置
      this.canvas.style.cursor = 'default';
      this.draw();
      this.updateInfoDisplay(); // 更新信息显示
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
        const mouseTime = mouseX / this.pixelsPerBeat;
        const mouseNote = 127 - (mouseY / this.pixelsPerNote);
        
        // 根据滚动方向调整缩放比例
        if (delta > 0) {
          this.pixelsPerBeat *= zoomFactor;
        } else {
          this.pixelsPerBeat /= zoomFactor;
        }
        
        // 限制缩放范围
        this.pixelsPerBeat = Math.max(20, Math.min(500, this.pixelsPerBeat));
        
        // 重新计算canvas尺寸
        this.resizeCanvas();
        
        // 调整滚动位置以保持鼠标位置不变
        const newMouseX = mouseTime * this.pixelsPerBeat;
        const newMouseY = (127 - mouseNote) * this.pixelsPerNote;
        
        const container = this.canvas.parentElement;
        container.scrollLeft += (newMouseX - mouseX);
        container.scrollTop += (newMouseY - mouseY);
        
        this.draw();
        
        console.log(`时间轴缩放: ${this.pixelsPerBeat} pixels/beat`);
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
      if (hoveredNote && this.selectedNotes.some(noteRef => 
        noteRef.midiNote === hoveredNote.midiNote && 
        noteRef.startTime === hoveredNote.startTime && 
        noteRef.endTime === hoveredNote.endTime &&
        noteRef.instrument === hoveredNote.instrument
      )) {
        e.preventDefault();
        
        // 根据滚动方向调整力度
        const delta = e.deltaY > 0 ? -5 : 5; // 每次调整5个单位
        
        // 批量调整所有选中音符的力度
        for (const noteRef of this.selectedNotes) {
          noteRef.velocity = Math.max(0, Math.min(100, noteRef.velocity + delta));
        }
        
        // 处理力度调节的历史记录
        this.handleVelocityAdjustment();
        
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
    
    // 添加BPM输入框事件监听器
    const bpmInput = document.getElementById('bpm-input');
    bpmInput.addEventListener('change', (e) => {
      const oldBpm = this.bpm;
      this.bpm = parseInt(e.target.value);
      this.pixelsPerSecond = this.calculatePixelsPerSecond();
      this.updateBpmDisplay();
      
      // 保存BPM变化的历史状态
      if (oldBpm !== this.bpm) {
        this.saveToHistory('bpm_change');
      }
      
      console.log(`BPM设置为: ${this.bpm}`);
    });
    
    // 添加鼠标滚轮调节BPM功能
    bpmInput.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      this.bpm = Math.max(20, Math.min(300, this.bpm + delta));
      bpmInput.value = this.bpm;
      this.pixelsPerSecond = this.calculatePixelsPerSecond();
      this.updateBpmDisplay();
      console.log(`BPM调整为: ${this.bpm}`);
    });
    
    // 添加每小节拍数输入框事件监听器
    const beatsPerMeasureInput = document.getElementById('beats-per-measure-input');
    beatsPerMeasureInput.addEventListener('change', (e) => {
      const oldBeatsPerMeasure = this.beatsPerMeasure;
      this.beatsPerMeasure = parseInt(e.target.value);
      this.updateBeatsPerMeasureDisplay();
      this.draw();
      
      // 保存拍数变化的历史状态
      if (oldBeatsPerMeasure !== this.beatsPerMeasure) {
        this.saveToHistory('beats_per_measure_change');
      }
      
      console.log(`每小节拍数设置为: ${this.beatsPerMeasure}`);
    });
    
    // 添加鼠标滚轮调节每小节拍数功能
    beatsPerMeasureInput.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      this.beatsPerMeasure = Math.max(0, Math.min(10, this.beatsPerMeasure + delta));
      beatsPerMeasureInput.value = this.beatsPerMeasure;
      this.updateBeatsPerMeasureDisplay();
      this.draw();
      console.log(`每小节拍数调整为: ${this.beatsPerMeasure}`);
    });
    
    // 移除了节拍器开关事件监听器，因为现在使用图标点击来切换状态
  }
  

  
  // 调整canvas尺寸
  resizeCanvas() {
    const container = this.canvas.parentElement;
    // 计算所需的最小宽度，基于播放头位置
    let minWidth = 880; // 默认最小宽度为880px
    
    // 在录制模式下，确保canvas宽度至少能容纳播放头位置，并略微提前以避免死锁
    if (this.isRecording) {
      const playheadTime = this.getPlayheadTime();
      // 将秒数转换为拍数
      const playheadBeats = playheadTime * this.bpm / 60;
      // 略微提前于播放头位置计算canvas宽度，预留2拍的空间
      const playheadWidth = (playheadBeats + 2) * this.pixelsPerBeat;
      minWidth = Math.max(minWidth, playheadWidth);
    } else if (this.tracks.length > 0) {
      // 如果有录制的音符，计算容纳所有音符所需的宽度
      let maxEndTime = 0;
      for (const track of this.tracks) {
        for (const note of track.notes) {
          if (note.endTime > maxEndTime) {
            maxEndTime = note.endTime;
          }
        }
      }
      // 计算所需宽度，额外增加10%的空间
      const requiredWidth = maxEndTime * this.pixelsPerBeat * 1.1;
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
    
    // 记录录制开始时的音符数量，用于判断是否有实际输入
    this.recordingStartNoteCount = this.getTotalNoteCount();
    
    // 为播放头添加录制状态样式
    this.playhead.classList.add('recording');
    
    // 更新按钮状态
    this.recordButton.style.display = 'none';
    this.stopButton.style.display = 'inline-flex';
    this.playButton.disabled = true;
    
    console.log('开始录制');
  }
  
  // 停止录制
  stopRecording() {
    this.isRecording = false;
    
    // 停止所有正在播放的音符
    for (const track of this.tracks) {
      for (const noteEntry of track.notes) {
        if (noteEntry.played) {
          this.audioEngine.stopNote(noteEntry.midiNote, track.instrument);
          noteEntry.played = false;
        }
      }
    }
    
    // 为所有未完成录制的音符设置结束时间为当前时间
    const elapsedTime = Tone.now() - this.startTime;
    const endBeats = elapsedTime * this.bpm / 60;
    for (const track of this.tracks) {
      for (const noteEntry of track.notes) {
        if (noteEntry.endTime === null) {
          noteEntry.endTime = endBeats;
          console.log(`自动完成音符: ${noteEntry.midiNote} 在结束录制时`);
        }
      }
    }
    
    // 移除播放头的录制状态样式
    this.playhead.classList.remove('recording');
    
    // 重新调整canvas大小以适应录制的音符
    this.resizeCanvas();
    
    // 检查录制期间是否有实际输入音符
    const currentNoteCount = this.getTotalNoteCount();
    const hasNotesAdded = currentNoteCount > this.recordingStartNoteCount;
    
    // 只有在录制期间有实际输入音符时才保存历史状态
    if (hasNotesAdded) {
      this.saveToHistory('recording');
      console.log(`录制完成，添加了 ${currentNoteCount - this.recordingStartNoteCount} 个音符`);
    } else {
      console.log('录制完成，但没有输入音符，不记录历史');
    }
    
    // 更新按钮状态
    this.recordButton.style.display = 'inline-flex';
    this.stopButton.style.display = 'none';
    this.playButton.disabled = false;
    
    console.log('停止录制');
    console.log('录制的轨道:', this.tracks);
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
    for (const track of this.tracks) {
      for (const note of track.notes) {
        if (note.startTime >= playheadTime || (note.startTime < playheadTime && note.endTime > playheadTime)) {
          hasNotesAfterPlayhead = true;
          break;
        }
      }
      if (hasNotesAfterPlayhead) break;
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
    if (this.tracks.length === 0) {
      alert('没有录制内容可保存');
      return;
    }
    
    // 创建要保存的数据对象，包含轨道信息、BPM和拍/小节信息
    const data = {
      tracks: this.tracks,
      bpm: this.bpm,
      beatsPerMeasure: this.beatsPerMeasure,
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
  
  // 导出MIDI文件
  exportMidi() {
    if (this.tracks.length === 0) {
      alert('没有录制内容可导出');
      return;
    }
    
    try {
      // 获取音色配置
      const instrumentConfig = window.mainController ? window.mainController.instrumentConfig : null;
      if (!instrumentConfig) {
        alert('无法获取音色配置');
        return;
      }
      
      // 调用MIDI导出器
      this.midiExporter.export(this.tracks, this.bpm, this.beatsPerMeasure, instrumentConfig);
      
      console.log('MIDI文件导出成功');
    } catch (error) {
      console.error('MIDI导出失败:', error);
      alert('MIDI导出失败: ' + error.message);
    }
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
        if (data.tracks && Array.isArray(data.tracks)) {
          // 保存导入前的状态
          this.saveToHistory('import');
          
          // 清空现有数据
          this.tracks = [];
          this.visibleInstruments.clear();
          
          // 导入BPM和拍/小节信息（如果存在）
          if (data.bpm !== undefined) {
            this.bpm = data.bpm;
            // 更新BPM输入框和显示
            const bpmInput = document.getElementById('bpm-input');
            if (bpmInput) {
              bpmInput.value = this.bpm;
            }
            this.updateBpmDisplay();
            console.log(`导入BPM: ${this.bpm}`);
          }
          
          if (data.beatsPerMeasure !== undefined) {
            this.beatsPerMeasure = data.beatsPerMeasure;
            // 更新拍/小节输入框和显示
            const beatsPerMeasureInput = document.getElementById('beats-per-measure-input');
            if (beatsPerMeasureInput) {
              beatsPerMeasureInput.value = this.beatsPerMeasure;
            }
            this.updateBeatsPerMeasureDisplay();
            console.log(`导入拍/小节: ${this.beatsPerMeasure}`);
          }
          
          // 重新计算pixelsPerBeat以确保正确显示
          this.pixelsPerBeat = this.calculatePixelsPerBeat();
          
          // 使用轨道格式
          this.tracks = data.tracks;
          
          // 设置所有音色为可见
          for (const track of this.tracks) {
            this.visibleInstruments.add(track.instrument);
          }
          
          // 清空选中列表
          this.selectedNotes = [];
          
          // 调整canvas尺寸以适应导入的音符
          this.resizeCanvas();
          
          // 更新音色显示控制面板
          this.updateInstrumentVisibilityPanel();
          
          console.log('录制内容已导入');
          
          // 异步预加载需要的音色（不阻塞音符显示）
          const notesToPreload = data.tracks.flatMap(track => 
            track.notes.map(note => ({ instrument: track.instrument }))
          );
          this.preloadInstrumentsAsync(notesToPreload);
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
    for (const track of this.tracks) {
      for (const noteEntry of track.notes) {
        if (noteEntry.played) {
          this.audioEngine.stopNote(noteEntry.midiNote, track.instrument);
          noteEntry.played = false;
        }
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
    
    // 移除播放头的录制状态样式
    this.playhead.classList.remove('recording');
    
    // 重置所有录制音符的播放状态
    for (const track of this.tracks) {
      for (const noteEntry of track.notes) {
        noteEntry.played = false;
      }
    }
    
    // 更新按钮状态
    this.playButton.style.display = 'inline-flex';
    this.pauseButton.style.display = 'none';
    this.recordButton.disabled = false;
    
    console.log('停止播放');
  }
  
  // 记录音符按下
  // 记录音符按下（合并后的实现）
  recordNoteOn(note, time) {
    if (this.isRecording) {
      // 检查是否有未结束的延音音符
      if (this.pendingReleases.has(note)) {
        const pendingEntry = this.pendingReleases.get(note);
        if (pendingEntry.endTime === null) {
          // 将endTime转换为拍数
          pendingEntry.endTime = (time - this.startTime) * this.bpm / 60;
          console.log(`覆盖延音音符: ${note}`);
          this.pendingReleases.delete(note);
        }
      }

      // 检查是否已经存在相同音符的未结束记录
      let existingNoteFound = false;
      for (const track of this.tracks) {
        const existingNote = track.notes.find(
          entry => entry.midiNote === note && entry.endTime === null
        );
        if (existingNote) {
          existingNoteFound = true;
          break;
        }
      }
      
      // 如果不存在相同音符的未结束记录，则创建新记录
      if (!existingNoteFound) {
        const elapsedTime = time - this.startTime;
        // 将startTime转换为拍数
        const startTimeBeats = elapsedTime * this.bpm / 60;
        
        // 获取当前选中的音色
        const currentInstrument = this.audioEngine.currentInstrument;
        
        // 使用新的轨道结构
        this.addNoteToTrack(note, startTimeBeats, null, 100, currentInstrument);
        
        console.log(`记录音符按下: ${note} at ${elapsedTime}s (${startTimeBeats} beats) with instrument: ${currentInstrument}`);
      } else {
        console.log(`跳过重复音符按下: ${note}（已有未结束记录）`);
      }
    }
  }
  
  // 记录音符松开
  recordNoteOff(note, time) {
    if (this.isRecording) {
      const elapsedTime = time - this.startTime;
      // 将秒数转换为拍数
      const endBeats = elapsedTime * this.bpm / 60;
      
      if (this.isSpacePressed) {
        // 查找最近未结束的同音高音符
        for (const track of this.tracks) {
          for (let i = track.notes.length - 1; i >= 0; i--) {
            const entry = track.notes[i];
            if (entry.midiNote === note && entry.endTime === null) {
              this.pendingReleases.set(note, entry);
              console.log(`延音状态保持音符: ${note}`);
              break;
            }
          }
        }
      } else {
        // 正常结束音符
        for (const track of this.tracks) {
          for (let i = track.notes.length - 1; i >= 0; i--) {
            const entry = track.notes[i];
            if (entry.midiNote === note && entry.endTime === null) {
              entry.endTime = endBeats;  // 以拍数记录结束时间
              console.log(`记录音符松开: ${note} at ${elapsedTime}s (${endBeats} beats)`);
              break;
            }
          }
        }
      }
    }
  }

  // 处理键盘事件
  handleKeyDown(e) {
    // 如果有右键菜单显示，先关闭菜单
    if (this.contextMenu && this.contextMenu.style.display === 'block') {
      this.hideContextMenu();
    }

    if (e.code === 'Space') {
      this.isSpacePressed = true;
      console.log('延音踏板激活');
    }
    
    // 处理复制、剪切、粘贴操作
    if (e.ctrlKey || e.metaKey) { // Ctrl键或Cmd键
      switch (e.code) {
        case 'KeyA': // Ctrl+A 全选
          e.preventDefault();
          this.selectAllNotes();
          break;
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
        case 'KeyZ': // Ctrl+Z 撤回
          e.preventDefault();
          this.undo();
          break;
        case 'KeyY': // Ctrl+Y 恢复
          e.preventDefault();
          this.redo();
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
      let hasChanged = false;
      
      switch (e.code) {
        case 'ArrowUp':
          // 批量向上移动音高
          for (const noteRef of this.selectedNotes) {
            if (noteRef.midiNote < 127) {
              noteRef.midiNote++;
              hasChanged = true;
            }
          }
          break;
        case 'ArrowDown':
          // 批量向下移动音高
          for (const noteRef of this.selectedNotes) {
            if (noteRef.midiNote > 0) {
              noteRef.midiNote--;
              hasChanged = true;
            }
          }
          break;
        case 'ArrowLeft':
          // 批量向左移动时间（以拍数为单位）
          for (const noteRef of this.selectedNotes) {
            if (noteRef.startTime > 0) {
              noteRef.startTime = Math.max(0, noteRef.startTime - step);
              noteRef.endTime -= step;
              hasChanged = true;
            }
          }
          break;
        case 'ArrowRight':
          // 批量向右移动时间（以拍数为单位）
          for (const noteRef of this.selectedNotes) {
            noteRef.startTime += step;
            noteRef.endTime += step;
            hasChanged = true;
          }
          break;
        case 'Delete':
            // 删除所有选中的音符
            this.deleteSelectedNotes();
            hasChanged = true; // 标记为有变化
            break;
      }
      
      // 如果有变化，保存历史状态
      if (hasChanged) {
        this.saveToHistory('keyboard_move');
      }
      
      this.draw();
    }
  }

  handleKeyUp(e) {
    // 如果有右键菜单显示，先关闭菜单
    if (this.contextMenu && this.contextMenu.style.display === 'block') {
      this.hideContextMenu();
    }

    if (e.code === 'Space') {
      this.isSpacePressed = false;
      console.log('延音踏板释放');
      
      // 添加空值检查
      if (this.pendingReleases) {
        this.pendingReleases.forEach((entry, note) => {
          if (entry && entry.endTime === null) {
            const elapsedTime = Tone.now() - (this.startTime || 0);
            // 将秒数转换为拍数
            entry.endTime = elapsedTime * this.bpm / 60;
            console.log(`延音释放处理音符: ${note} at ${elapsedTime}s (${entry.endTime} beats)`);
          }
        });
        this.pendingReleases.clear();
      }
    }
  }
  

  
  // 删除选中音符
  deleteSelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    // 先执行删除操作
    this.deleteSelectedNotesWithoutHistory();
    
    // 保存删除后的状态
    this.saveToHistory('delete');
  }

  // 删除选中音符（不记录历史）
  deleteSelectedNotesWithoutHistory() {
    if (this.selectedNotes.length === 0) return;
    
    // 收集需要删除的音符，按轨道分组
    const notesToDelete = new Map(); // track -> [noteIndexes]
    
    for (const noteRef of this.selectedNotes) {
      if (!notesToDelete.has(noteRef.track)) {
        notesToDelete.set(noteRef.track, []);
      }
      notesToDelete.get(noteRef.track).push(noteRef.noteIndex);
    }
    
    // 从轨道中移除音符（从后往前删除，避免索引变化）
    for (const [track, noteIndexes] of notesToDelete) {
      // 排序并去重，从大到小删除
      const sortedIndexes = [...new Set(noteIndexes)].sort((a, b) => b - a);
      for (const noteIndex of sortedIndexes) {
        if (noteIndex >= 0 && noteIndex < track.notes.length) {
          track.notes.splice(noteIndex, 1);
        }
      }
    }
    
    // 清空选中列表
    this.selectedNotes = [];
    
    // 清理空的轨道
    this.cleanupEmptyTracks();
    
    // 更新音色显示控制面板
    this.updateInstrumentVisibilityPanel();
    
    this.draw();
    this.updateInfoDisplay();
  }

  // 获取总音符数量
  getTotalNoteCount() {
    let totalCount = 0;
    for (const track of this.tracks) {
      totalCount += track.notes.length;
    }
    return totalCount;
  }
  
  // 复制选中音符
  copySelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    // 将选中的音符信息存储到剪贴板（保持拍数单位）
    this.clipboard = [];
    for (const noteRef of this.selectedNotes) {
      this.clipboard.push({
        midiNote: noteRef.midiNote,
        startTime: noteRef.startTime,  // 以拍数记录的开始时间
        endTime: noteRef.endTime,      // 以拍数记录的结束时间
        velocity: noteRef.velocity,
        instrument: noteRef.instrument  // 包含音色信息
      });
    }
    
    console.log('复制音符到剪贴板');
  }
  
  // 剪切选中音符
  cutSelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    console.log('开始剪切操作，选中音符数量:', this.selectedNotes.length);
    
    // 先复制选中的音符
    this.copySelectedNotes();
    
    // 然后删除选中的音符（不记录历史，因为剪切操作会记录）
    this.deleteSelectedNotesWithoutHistory();
    
    // 保存剪切后的状态（在删除音符之后）
    this.saveToHistory('cut');
    
    console.log('剪切音符到剪贴板完成');
  }
  
  // 粘贴音符
  pasteNotes() {
    if (!this.clipboard || this.clipboard.length === 0) return;
    
    // 获取当前播放头时间（以拍数为单位）
    const playheadTime = this.getPlayheadTime() * this.bpm / 60;  // 转换为拍数
    
    // 找到剪贴板中最早的音符时间
    let earliestTime = Infinity;
    for (const note of this.clipboard) {
      if (note.startTime < earliestTime) {
        earliestTime = note.startTime;
      }
    }
    
    // 计算时间偏移量（以拍数为单位）
    const timeOffset = playheadTime - earliestTime;
    
    // 清空当前选中列表
    this.selectedNotes = [];
    
    // 创建新音符并添加到轨道中
    for (const note of this.clipboard) {
      const newNote = {
        midiNote: note.midiNote,
        startTime: note.startTime + timeOffset,  // 以拍数记录的开始时间
        endTime: note.endTime + timeOffset,      // 以拍数记录的结束时间
        velocity: note.velocity,
        played: false
      };
      
      // 添加到对应的轨道
      this.addNoteToTrack(
        newNote.midiNote,
        newNote.startTime,
        newNote.endTime,
        newNote.velocity,
        note.instrument
      );
      
      // 将新音符添加到选中列表（需要重新获取引用）
      const newNoteRef = this.createNoteReference(
        this.getOrCreateTrack(note.instrument),
        this.getOrCreateTrack(note.instrument).notes.length - 1
      );
      this.selectedNotes.push(newNoteRef);
    }
    
    // 保存粘贴后的状态（在添加音符之后）
    this.saveToHistory('paste');
    
    this.draw();
    this.updateInfoDisplay();
    
    console.log('从剪贴板粘贴音符');
  }

  // 全选音符
  selectAllNotes() {
    // 清空当前选中列表
    this.selectedNotes = [];
    
    // 只选择可见音色的音符
    for (const track of this.tracks) {
      // 检查音色是否可见
      if (!this.visibleInstruments.has(track.instrument)) {
        continue;
      }
      
      for (let i = 0; i < track.notes.length; i++) {
        // 添加音符引用
        this.selectedNotes.push(this.createNoteReference(track, i));
      }
    }
    
    this.draw();
    this.updateInfoDisplay();
    
    console.log('全选可见音符');
  }

  
  // 设置播放头位置
  setPlayheadPosition(x, isUserAction = false) {
    this.playheadPosition = Math.max(0, Math.min(x, this.canvas.width));
    this.playhead.style.left = `${this.playheadPosition}px`;
    
    // 自动滚动以跟随播放头
    this.autoScrollToPlayhead();
    
    // 只有在用户手动调整播放头位置时才重置节拍器状态
    if (isUserAction) {
      this.currentBeat = 0;
      this.lastBeatTime = 0;
    }
    
    // 如果正在暂停，更新pausedTime以反映新的播放头位置
    if (this.isPaused) {
      const beats = this.playheadPosition / this.pixelsPerBeat;
      this.pausedTime = beats * 60 / this.bpm;
    }
    
    // 更新信息显示
    this.updateInfoDisplay();
  }
  
  // 获取播放头位置对应的时间
  getPlayheadTime() {
    // 返回以秒为单位的时间
    const beats = this.playheadPosition / this.pixelsPerBeat;
    return beats * 60 / this.bpm;
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
  
  // 获取指定位置的音符引用
  getNoteAtPosition(x, y) {
    // 将像素坐标转换为时间/音高坐标（使用拍数）
    const beats = x / this.pixelsPerBeat;
    const note = 127 - Math.floor(y / this.pixelsPerNote);
    
    // 查找匹配的音符（只考虑可见的音符）
    for (const track of this.tracks) {
      // 检查音色是否可见
      if (!this.visibleInstruments.has(track.instrument)) {
        continue;
      }
      
      for (let i = 0; i < track.notes.length; i++) {
        const noteEntry = track.notes[i];
        if (beats >= noteEntry.startTime && beats <= noteEntry.endTime && note === noteEntry.midiNote) {
          // 返回音符引用
          return this.createNoteReference(track, i);
        }
      }
    }
    
    return null;
  }
  
  // 选择音符
  selectNote(noteRef, x, y) {
    this.isEditing = true;
    this.hasDragged = false; // 重置拖拽标志
    
    // 如果该音符尚未被选中，则添加到选中列表
    if (this.findNoteRefIndex(noteRef) === -1) {
      this.selectedNotes.push(noteRef);
    }
    
    // 设置拖拽基准音符为当前被按住的音符
    this.dragReferenceNote = noteRef;
    
    // 计算拖拽偏移量（使用被按住的音符作为参考）
    const referenceNote = noteRef.note; // 使用被按住的音符作为参考
    const noteX = referenceNote.startTime * this.pixelsPerBeat;
    const noteWidth = (referenceNote.endTime - referenceNote.startTime) * this.pixelsPerBeat;
    const noteY = (127 - referenceNote.midiNote) * this.pixelsPerNote;
    
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
    // 使用拖拽基准音符作为参考
    const referenceNote = this.dragReferenceNote ? this.dragReferenceNote.note : this.selectedNotes[0].note;
    // 将像素位置转换为拍数
    let newStartTime = (x - this.dragOffsetX) / this.pixelsPerBeat;
    const duration = referenceNote.endTime - referenceNote.startTime;
    let newEndTime = newStartTime + duration;
    
    // 如果启用了自动吸附功能，则对时间位置进行吸附
    if (this.isSnapEnabled) {
      // 计算最近的拍数位置，考虑吸附精度
      const snappedStartBeats = Math.round(newStartTime * this.snapPrecision) / this.snapPrecision;
      const snapOffset = snappedStartBeats - newStartTime;
      // 使用新的灵敏度变量，考虑吸附精度
      if (Math.abs(snapOffset) < (this.snapSensitivity / this.snapPrecision)) {
        newStartTime = snappedStartBeats;
        newEndTime = newStartTime + duration;
      }
    }
    
    // 计算时间偏移量
    const timeOffset = newStartTime - referenceNote.startTime;
    
    // 计算新的音高偏移量
    const newNote = 127 - Math.floor(y / this.pixelsPerNote);
    const pitchOffset = newNote - referenceNote.midiNote;
    
    // 批量更新所有选中音符的位置
    for (const noteRef of this.selectedNotes) {
      // 更新时间
      noteRef.startTime = Math.max(0, noteRef.startTime + timeOffset);
      noteRef.endTime = Math.max(noteRef.startTime, noteRef.endTime + timeOffset);
      
      // 更新音高
      const newPitch = noteRef.midiNote + pitchOffset;
      if (newPitch >= 0 && newPitch <= 127) {
        noteRef.midiNote = newPitch;
      }
    }
  }
  
  // 辅助方法：时间吸附
  snapToBeat(time) {
    if (!this.isSnapEnabled) return time;
    const snapped = Math.round(time * this.snapPrecision) / this.snapPrecision;
    const snapOffset = snapped - time;
    return Math.abs(snapOffset) < (this.snapSensitivity / this.snapPrecision) ? snapped : time;
  }

  // 辅助方法：从末尾拉伸音符
  stretchNotesFromEnd(notes, endTime, ratio) {
    for (const note of notes) {
      const relativeStart = endTime - note.startTime;
      const relativeEnd = endTime - note.endTime;
      const newRelativeStart = relativeStart * ratio;
      const newRelativeEnd = relativeEnd * ratio;
      const newStartTime = endTime - newRelativeStart;
      const newEndTime = endTime - newRelativeEnd;

      note.startTime = Math.max(0, newStartTime);
      note.endTime = newEndTime;
    }
  }

  // 辅助方法：从开始拉伸音符
  stretchNotesFromStart(notes, startTime, ratio) {
    for (const note of notes) {
      const relativeStart = note.startTime - startTime;
      const relativeEnd = note.endTime - startTime;
      const newStartTime = startTime + (relativeStart * ratio);
      const newEndTime = startTime + (relativeEnd * ratio);

      note.startTime = newStartTime;
      note.endTime = newEndTime;
    }
  }

  // 调整音符左边缘
  resizeNoteLeft(x) {
    const newStartTime = this.snapToBeat(x / this.pixelsPerBeat);

    if (this.selectedNotes.length > 1) {
      const referenceNote = this.dragReferenceNote?.note || this.selectedNotes[0].note;
      const latestEndTime = Math.max(...this.selectedNotes.map(note => note.endTime));

      const originalDuration = latestEndTime - referenceNote.startTime;
      const newDuration = latestEndTime - newStartTime;

      if (newDuration > 0 && originalDuration > 0) {
        const ratio = newDuration / originalDuration;
        this.stretchNotesFromEnd(this.selectedNotes, latestEndTime, ratio);
      }
    } else {
      const referenceNote = this.dragReferenceNote?.note || this.selectedNotes[0].note;
      if (newStartTime < referenceNote.endTime) {
        referenceNote.startTime = Math.max(0, newStartTime);
      }
    }
  }
  
  // 调整音符右边缘
  resizeNoteRight(x) {
    const newEndTime = this.snapToBeat(x / this.pixelsPerBeat);

    if (this.selectedNotes.length > 1) {
      const referenceNote = this.dragReferenceNote?.note || this.selectedNotes[0].note;
      const earliestStartTime = Math.min(...this.selectedNotes.map(note => note.startTime));

      const originalDuration = referenceNote.endTime - earliestStartTime;
      const newDuration = newEndTime - earliestStartTime;

      if (newDuration > 0 && originalDuration > 0) {
        const ratio = newDuration / originalDuration;
        this.stretchNotesFromStart(this.selectedNotes, earliestStartTime, ratio);
      }
    } else {
      const referenceNote = this.dragReferenceNote?.note || this.selectedNotes[0].note;
      if (newEndTime > referenceNote.startTime) {
        referenceNote.endTime = newEndTime;
      }
    }
  }
  
  // 完成拖拽
  finishDrag() {
    // 检查是否有待取消选中的音符，并且没有发生拖拽
    if (this.pendingDeselect && !this.hasDragged) {
      const index = this.findNoteRefIndex(this.pendingDeselect);
      if (index > -1) {
        this.selectedNotes.splice(index, 1);
      }
    }
    
    // 如果发生了拖拽，保存历史状态
    if (this.hasDragged) {
      this.saveToHistory('move');
    }
    
    // 重置所有交互状态
    this.resetInteractionState();
    
    this.draw();
  }
  
  // 一键吸附所有选中的音符
  snapAllNotes() {
    // 检查是否有选中的音符
    if (this.selectedNotes.length === 0) {
      console.log('没有选中的音符');
      return;
    }
    
    // 遍历所有选中的音符，对每个音符进行独立吸附
    for (const noteRef of this.selectedNotes) {
      // 计算最近的拍数位置，考虑吸附精度
      const snappedStartBeats = Math.round(noteRef.startTime * this.snapPrecision) / this.snapPrecision;
      const snapOffset = snappedStartBeats - noteRef.startTime;
      
      // 使用新的灵敏度变量，考虑吸附精度
      if (Math.abs(snapOffset) < (this.snapSensitivity / this.snapPrecision)) {
        // 计算时间偏移量
        const timeOffset = snappedStartBeats - noteRef.startTime;
        
        // 更新音符的开始和结束时间
        noteRef.startTime = Math.max(0, noteRef.startTime + timeOffset);
        noteRef.endTime = noteRef.endTime + timeOffset;
      }
    }
    
    // 保存吸附后的状态
    this.saveToHistory('snap_position');
    
    // 重绘
    this.draw();
  }
  
  // 一键吸附时长
  snapDuration() {
    // 检查是否有选中的音符
    if (this.selectedNotes.length === 0) {
      console.log('没有选中的音符');
      return;
    }
    
    // 获取一个刻度的长度（以拍为单位）
    const oneBeat = 1 / this.snapPrecision;
    
    // 遍历所有选中的音符，对每个音符的时长进行独立吸附
    for (const noteRef of this.selectedNotes) {
      // 计算当前音符的时长
      const duration = noteRef.endTime - noteRef.startTime;
      
      // 计算量化后的时长（以刻度为单位）
      const snappedDuration = Math.round(duration * this.snapPrecision) / this.snapPrecision;
      
      // 检查吸附后的时长是否至少为一个刻度长度
      if (snappedDuration >= oneBeat) {
        // 更新音符的结束时间
        noteRef.endTime = noteRef.startTime + snappedDuration;
      } else {
        // 如果吸附后的时长小于一个刻度长度，则保持原时长不变
        console.log('音符时长过短，不进行吸附');
      }
    }
    
    // 保存吸附后的状态
    this.saveToHistory('snap_duration');
    
    // 重绘
    this.draw();
  }
  
  // 完成框选
  finishSelection() {
    // 计算框选区域
    const startX = Math.min(this.selectionStartX, this.selectionEndX);
    const startY = Math.min(this.selectionStartY, this.selectionEndY);
    const endX = Math.max(this.selectionStartX, this.selectionEndX);
    const endY = Math.max(this.selectionStartY, this.selectionEndY);
    
    // 将像素坐标转换为时间/音高坐标（使用拍数）
    const startBeats = startX / this.pixelsPerBeat;
    const endBeats = endX / this.pixelsPerBeat;
    const startNote = 127 - Math.floor(endY / this.pixelsPerNote); // 注意：y坐标是反向的
    const endNote = 127 - Math.floor(startY / this.pixelsPerNote);
    
    // 查找框选区域内的音符（只考虑可见的音符）
    const selectedNotesInRegion = [];
    for (const track of this.tracks) {
      // 检查音色是否可见
      if (!this.visibleInstruments.has(track.instrument)) {
        continue;
      }
      
      for (let i = 0; i < track.notes.length; i++) {
        const noteEntry = track.notes[i];
        // 检查音符是否在框选区域内
        // 音符与选择区域有重叠就算选中
        if (noteEntry.midiNote >= startNote && noteEntry.midiNote <= endNote &&
            noteEntry.endTime >= startBeats && noteEntry.startTime <= endBeats) {
          // 添加音符引用
          selectedNotesInRegion.push(this.createNoteReference(track, i));
        }
      }
    }
    
    // 将框选区域内的音符添加到选中列表中（不重复添加）
    for (const noteRef of selectedNotesInRegion) {
      if (this.findNoteRefIndex(noteRef) === -1) {
        this.selectedNotes.push(noteRef);
      }
    }
    
    // 重置选择框坐标
    this.selectionStartX = 0;
    this.selectionStartY = 0;
    this.selectionEndX = 0;
    this.selectionEndY = 0;
    
    // 重绘
    this.draw();
    this.updateInfoDisplay();
  }
  
  // 动画循环
  animate() {
    // 更新播放头位置
    if (this.isRecording) {
      const elapsedTime = Tone.now() - this.startTime;
      // 将秒数转换为拍数
      const beats = elapsedTime * this.bpm / 60;
      const position = beats * this.pixelsPerBeat;
      this.setPlayheadPosition(position);
      
      // 播放录制的音符
      this.playRecordedNotes(elapsedTime).catch(error => {
        console.error('播放录制音符时出错:', error);
      });
      
      // 播放节拍器
      if (this.isMetronomeEnabled) {
        this.playMetronomeBeat(elapsedTime);
      }
      
      // 定期重新调整canvas大小以适应不断增长的录制内容
      // 每0.1秒检查一次是否需要调整canvas大小，确保更流畅的体验
      if (!this.lastResizeTime || elapsedTime - this.lastResizeTime > 0.1) {
        this.resizeCanvas();
        this.lastResizeTime = elapsedTime;
      }
    } else if (this.isPlaying) {
      const elapsedTime = Tone.now() - this.startTime;
      // 将秒数转换为拍数
      const beats = elapsedTime * this.bpm / 60;
      const position = beats * this.pixelsPerBeat;
      this.setPlayheadPosition(position);
      
      // 播放录制的音符
      this.playRecordedNotes(elapsedTime).catch(error => {
        console.error('播放录制音符时出错:', error);
      });
      
      // 播放节拍器
      if (this.isMetronomeEnabled) {
        this.playMetronomeBeat(elapsedTime);
      }
      
          // 检查是否播放完所有音符，如果是则自动暂停
    if (this.tracks.length > 0) {
      // 找到最后一个音符的结束时间
      let maxEndTime = 0;
      for (const track of this.tracks) {
        for (const note of track.notes) {
          if (note.endTime > maxEndTime) {
            maxEndTime = note.endTime;
          }
        }
      }
      
      // 如果播放头已经超过了最后一个音符的结束时间，则暂停
      if (elapsedTime > maxEndTime * 60 / this.bpm) {
        this.pause();
      }
    }
    } else if (this.isPaused) {
      // 暂停时保持播放头位置不变
    }
    
    // 绘制
    this.draw();
    
    // 更新信息显示
    this.updateInfoDisplay();
    
    // 继续动画循环
    requestAnimationFrame(() => this.animate());
  }
  
  // 播放录制的音符
  async playRecordedNotes(currentTime) {
    // 将当前时间（秒）转换为拍数
    const currentBeats = currentTime * this.bpm / 60;
    
    // 使用轨道结构播放音符
    for (const track of this.tracks) {
      // 检查音色是否可见且已加载
      if (!this.visibleInstruments.has(track.instrument)) {
        continue;
      }
      
      for (const noteEntry of track.notes) {
        // 检查是否应该播放这个音符（使用拍数进行比较）
        if (noteEntry.startTime <= currentBeats && noteEntry.endTime > currentBeats) {
          // 检查是否已经播放过
          if (!noteEntry.played) {
            // 播放音符，使用音符的力度值和音色
            await this.audioEngine.playNote(noteEntry.midiNote, noteEntry.velocity, false, track.instrument);
            noteEntry.played = true;
            console.log(`播放录制的音符: ${noteEntry.midiNote} with instrument: ${track.instrument}`);
          }
        } else if (noteEntry.endTime <= currentBeats && noteEntry.played) {
          // 停止音符
          this.audioEngine.stopNote(noteEntry.midiNote, track.instrument);
          noteEntry.played = false;
        } else if (noteEntry.startTime > currentBeats && noteEntry.played) {
          // 重置未来的音符状态
          noteEntry.played = false;
        }
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
      this.ctx.lineWidth = 0.25; // 更细
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
      this.ctx.lineWidth = 0.5;
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
  
  // 计算小节数
  calculateMeasureNumber(beats) {
    if (this.beatsPerMeasure <= 0) return 0;
    return Math.floor(beats / this.beatsPerMeasure) + 1;
  }
  
  // 格式化时间显示（包含小节数）
  formatTimeDisplay(seconds, beats) {
    const measureNumber = this.calculateMeasureNumber(beats);
    if (this.beatsPerMeasure > 0) {
      return `${seconds.toFixed(2)}s (${beats.toFixed(2)} beats, 第${measureNumber}小节)`;
    } else {
      return `${seconds.toFixed(2)}s (${beats.toFixed(2)} beats)`;
    }
  }
  
  // 更新信息显示
  updateInfoDisplay() {
    // 更新播放头位置和音轨总长信息
    const playheadTime = this.getPlayheadTime();
    const playheadBeats = playheadTime * this.bpm / 60;
    
    // 计算音轨总长
    let trackDuration = 0;
    if (this.tracks.length > 0) {
      for (const track of this.tracks) {
        for (const note of track.notes) {
          if (note.endTime > trackDuration) {
            trackDuration = note.endTime;
          }
        }
      }
    }
    const trackBeats = trackDuration * this.bpm / 60;
    
    // 更新播放头位置和音轨总长显示
    const playheadPositionElement = document.getElementById('playhead-position');
    const trackDurationElement = document.getElementById('track-duration');
    
    if (playheadPositionElement) {
      playheadPositionElement.textContent = this.formatTimeDisplay(playheadTime, playheadBeats);
    }
    
    if (trackDurationElement) {
      trackDurationElement.textContent = this.formatTimeDisplay(trackDuration, trackBeats);
    }
    
    // 更新选中音符信息
    const selectedNotesInfoElement = document.getElementById('selected-notes-info');
    
    if (selectedNotesInfoElement) {
      if (this.selectedNotes.length === 0) {
        // 没有选中音符时，显示鼠标位置
        this.updateMouseInfo();
      } else if (this.selectedNotes.length === 1) {
        // 显示单个音符的信息
        const noteRef = this.selectedNotes[0];
        const noteName = this.noteNumberToNoteName(noteRef.midiNote);
        // 将拍数转换为秒数进行显示
        const startTimeSeconds = noteRef.startTime * 60 / this.bpm;
        const endTimeSeconds = noteRef.endTime * 60 / this.bpm;
        
        let infoText = `开始时间: ${this.formatTimeDisplay(startTimeSeconds, noteRef.startTime)}, 结束时间: ${this.formatTimeDisplay(endTimeSeconds, noteRef.endTime)}, 音高: ${noteName}, 力度: ${noteRef.velocity}`;
        
        // 显示音色信息
        const track = this.findTrackByNote(noteRef);
        if (track) {
          const instrumentName = this.getInstrumentName(track.instrument);
          infoText += `, 音色: ${instrumentName}`;
        }
        
        selectedNotesInfoElement.textContent = infoText;
      } else {
        // 显示多个音符的统计信息
        let earliestStartTime = Infinity;
        let latestEndTime = -Infinity;
        let allSameInstrument = true;
        let firstInstrument = null;
        
        for (const noteRef of this.selectedNotes) {
          if (noteRef.startTime < earliestStartTime) {
            earliestStartTime = noteRef.startTime;
          }
          if (noteRef.endTime > latestEndTime) {
            latestEndTime = noteRef.endTime;
          }
          
          // 检查是否所有音符都属于同一个音色
          const track = this.findTrackByNote(noteRef);
          if (track) {
            if (firstInstrument === null) {
              firstInstrument = track.instrument;
            } else if (track.instrument !== firstInstrument) {
              allSameInstrument = false;
            }
          }
        }
        
        // 将拍数转换为秒数进行显示
        const earliestStartTimeSeconds = earliestStartTime * 60 / this.bpm;
        const latestEndTimeSeconds = latestEndTime * 60 / this.bpm;
        const earliestStartBeats = earliestStartTime;
        const latestEndBeats = latestEndTime;
        
        let infoText = `选中${this.selectedNotes.length}个音符, 开始时间: ${this.formatTimeDisplay(earliestStartTimeSeconds, earliestStartBeats)}, 结束时间: ${this.formatTimeDisplay(latestEndTimeSeconds, latestEndBeats)}`;
        
        // 如果所有音符都属于同一个音色，显示音色名
        if (allSameInstrument && firstInstrument) {
          const instrumentName = this.getInstrumentName(firstInstrument);
          infoText += `, 音色: ${instrumentName}`;
        }
        
        selectedNotesInfoElement.textContent = infoText;
      }
    }
  }
  
  // 更新鼠标位置信息
  updateMouseInfo() {
    const selectedNotesInfoElement = document.getElementById('selected-notes-info');
    if (!selectedNotesInfoElement) return;
    
    if (this.selectedNotes.length === 0) {
      // 没有选中音符时，显示鼠标位置
      if (this.lastMousePosition) {
        const mouseTime = this.lastMousePosition.x / this.pixelsPerBeat;
        const mouseTimeSeconds = mouseTime * 60 / this.bpm;
        const mouseTimeBeats = mouseTime;
        const mouseNote = 127 - (this.lastMousePosition.y / this.pixelsPerNote);
        const noteName = this.noteNumberToNoteName(Math.round(mouseNote));
        
        selectedNotesInfoElement.textContent = `鼠标位置: ${this.formatTimeDisplay(mouseTimeSeconds, mouseTimeBeats)}, 音高: ${noteName}`;
      } else {
        selectedNotesInfoElement.textContent = '';
      }
    }
    // 有选中音符时，updateInfoDisplay方法会处理选中音符信息的显示
  }
  
  // 根据音符查找对应的轨道
  findTrackByNote(noteRef) {
    for (const track of this.tracks) {
      if (noteRef.noteIndex >= 0 && noteRef.noteIndex < track.notes.length) {
        const actualNote = track.notes[noteRef.noteIndex];
        if (actualNote && 
            actualNote.midiNote === noteRef.midiNote &&
            actualNote.startTime === noteRef.startTime &&
            actualNote.endTime === noteRef.endTime &&
            actualNote.velocity === noteRef.velocity) {
          return track;
        }
      }
    }
    return null;
  }
  
  // 绘制网格
  drawGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 绘制音高背景色
    const noteHeight = height / 128; // MIDI音符范围是0-127
    
    // 用深浅交错的背景色替代每个音高的细线
    for (let i = 0; i < 128; i++) {
      // 检查当前音高是否正在播放
      if (this.activePlayNotes.has(i)) {
        // 高亮当前播放的音高行
        if (i % 2 === 0) {
          this.ctx.fillStyle = '#333333'; // 深色高亮
        } else {
          this.ctx.fillStyle = '#333333'; // 浅色高亮
        }
      } else if (i % 2 === 0) {
        this.ctx.fillStyle = '#1a1a1a'; // 深色
      } else {
        this.ctx.fillStyle = '#121212'; // 浅色
      }
      
      const y = height - (i * noteHeight);
      this.ctx.fillRect(0, y - noteHeight, width, noteHeight);
    }
    
    // 绘制八度线（保留）
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 0.5;
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
    // 拍线：更浅更细
    this.ctx.strokeStyle = '#444';  // 更浅的颜色
    this.ctx.lineWidth = 0.125;      // 更细的线
    
    // 每拍绘制一条垂直线
    for (let i = 0; i < width; i += this.pixelsPerBeat) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, height);
      this.ctx.stroke();
    }
    
    // 小节线：与拍线相同颜色和粗细（当beatsPerMeasure > 0时）
    if (this.beatsPerMeasure > 0) {
      const pixelsPerMeasure = this.pixelsPerBeat * this.beatsPerMeasure;
      this.ctx.strokeStyle = '#444';  // 与拍线相同颜色
      this.ctx.lineWidth = 0.125;      // 与拍线相同粗细
      for (let i = 0; i < width; i += pixelsPerMeasure) {
        this.ctx.beginPath();
        this.ctx.moveTo(i, 0);
        this.ctx.lineTo(i, height);
        this.ctx.stroke();
      }
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
    
    // 获取当前播放头位置（以拍数为单位）
    let currentPlayheadBeats = 0;
    if (this.isRecording || this.isPlaying) {
      const elapsedTime = Tone.now() - this.startTime;
      currentPlayheadBeats = elapsedTime * this.bpm / 60;
    } else if (this.isPaused) {
      currentPlayheadBeats = this.pausedTime * this.bpm / 60;
    } else {
      currentPlayheadBeats = this.playheadPosition / this.pixelsPerBeat;
    }
    
    // 使用轨道结构绘制音符
    for (const track of this.tracks) {
      // 检查音色是否可见
      if (!this.visibleInstruments.has(track.instrument)) {
        continue;
      }
      
      for (const noteEntry of track.notes) {
        if (noteEntry.startTime !== null) {
          // 将拍数转换为像素位置
          const x = noteEntry.startTime * this.pixelsPerBeat;
          const y = height - (noteEntry.midiNote * noteHeight);
          
          // 确定音符宽度
          let noteWidth;
          if (noteEntry.endTime !== null) {
            // 已完成录制的音符
            noteWidth = (noteEntry.endTime - noteEntry.startTime) * this.pixelsPerBeat;
          } else if (this.isRecording) {
            // 正在录制的音符，使用播放头位置作为结束时间
            noteWidth = Math.max(0, currentPlayheadBeats - noteEntry.startTime) * this.pixelsPerBeat;
          } else {
            // 未完成录制且不在录制状态的音符，显示为一个小点
            noteWidth = 2;
          }
          
          // 获取音符颜色
          const noteColor = this.getNoteColor(track.instrument);
          
          // 根据力度值计算填充颜色的透明度
          const alpha = noteEntry.velocity / 100;  // 0-100映射到0-1的透明度
          
          // 将十六进制颜色转换为RGBA
          const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };
          
          // 检查是否需要高光效果
          const isHighlighted = this.highlightedInstrument === track.instrument;
          
          if (isHighlighted) {
            // 绘制高光效果（发光边框）
            this.ctx.shadowColor = noteColor;
            this.ctx.shadowBlur = 8;
            this.ctx.strokeStyle = noteColor;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x - 1, y - noteHeight - 1, noteWidth + 2, noteHeight + 2);
            this.ctx.shadowBlur = 0;
          }
          
          // 绘制音符主体
          this.ctx.fillStyle = hexToRgba(noteColor, alpha);
          this.ctx.fillRect(x, y - noteHeight, noteWidth, noteHeight);
          
          // 绘制边框 - 使用比填充色深一点的颜色
          const darkerColor = this.getDarkerColor(noteColor);
          this.ctx.strokeStyle = darkerColor;
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(x, y - noteHeight, noteWidth, noteHeight);
        }
      }
    }
    
    // 绘制鼠标输入的临时音符（按下时显示并随时间动态增长）
    if (this.isMousePressed && this.mouseInputNote !== null && this.mouseInputStartBeats > 0) {
      const currentInstrument = this.audioEngine.currentInstrument;
      
      // 检查当前乐器是否可见
      if (this.visibleInstruments.has(currentInstrument)) {
        // 计算当前时间对应的拍数
        const now = Date.now();
        const durationMs = now - this.mouseInputStartTime;
        const currentBeats = this.mouseInputStartBeats + (durationMs / 1000 * this.bpm / 60);
        
        // 计算音符位置和宽度
        const x = this.mouseInputStartBeats * this.pixelsPerBeat;
        const y = height - (this.mouseInputNote * noteHeight);
        const noteWidth = Math.max(2, (currentBeats - this.mouseInputStartBeats) * this.pixelsPerBeat);
        
        // 获取当前乐器的颜色
        const noteColor = this.getNoteColor(currentInstrument);
        
        // 使用稍微透明的颜色绘制临时音符
        const alpha = 0.6; // 临时音符透明度
        this.ctx.fillStyle = `rgba(0, 0, 0, 0)`; // 清空背景
        this.ctx.strokeStyle = noteColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y - noteHeight, noteWidth, noteHeight);
        
        // 填充稍微透明的颜色
        const hexToRgba = (hex, alpha) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        this.ctx.fillStyle = hexToRgba(noteColor, alpha);
        this.ctx.fillRect(x, y - noteHeight, noteWidth, noteHeight);
      }
    }
  }
  
  // 绘制选中的音符
  drawSelectedNotes() {
    if (this.selectedNotes.length === 0) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const noteHeight = height / 128;
    
    for (const noteRef of this.selectedNotes) {
      // 检查音符引用是否有效
      if (!noteRef || !noteRef.note) {
        console.warn('drawSelectedNotes: Invalid noteRef detected, skipping');
        continue;
      }
      
      const x = noteRef.startTime * this.pixelsPerBeat;
      const y = height - (noteRef.midiNote * noteHeight);
      const widthValue = (noteRef.endTime - noteRef.startTime) * this.pixelsPerBeat;
      
      // 绘制高亮边框
      this.ctx.strokeStyle = '#ffcc00';
      this.ctx.lineWidth = 1;
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
    if (!this.hoveredNote || !this.hoveredNote.note) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const noteHeight = height / 128;
    
    const x = this.hoveredNote.startTime * this.pixelsPerBeat;
    const y = height - (this.hoveredNote.midiNote * noteHeight);
    const widthValue = (this.hoveredNote.endTime - this.hoveredNote.startTime) * this.pixelsPerBeat;
    
    // 绘制半透明高光
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(x, y - noteHeight, widthValue, noteHeight);
    
    // 绘制高亮边框
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(x, y - noteHeight, widthValue, noteHeight);
  }
  
  // 设置音色配置引用
  setInstrumentConfig(config) {
    this.instrumentConfig = config;
  }

  // 初始化右键菜单
  initContextMenu() {
    // 创建菜单容器
    this.contextMenu = document.createElement('div');
    this.contextMenu.className = 'editor-context-menu';
    this.contextMenu.style.display = 'none';
    document.body.appendChild(this.contextMenu);

    // 创建音色二级菜单容器
    this.toneSubmenu = document.createElement('div');
    this.toneSubmenu.className = 'editor-context-menu editor-context-submenu';
    this.toneSubmenu.style.display = 'none';
    document.body.appendChild(this.toneSubmenu);

    // 菜单项配置：文本、快捷键、处理器、可用性判断
    this.contextMenuItems = [
      { key: 'undo', label: '撤回', hint: 'Ctrl+Z', handler: () => this.undo(), enable: () => this.canUndo() },
      { key: 'redo', label: '恢复', hint: 'Ctrl+Y', handler: () => this.redo(), enable: () => this.canRedo() },
      { key: 'cut', label: '剪切', hint: 'Ctrl+X', handler: () => this.cutSelectedNotes(), enable: () => this.selectedNotes && this.selectedNotes.length > 0 },
      { key: 'copy', label: '复制', hint: 'Ctrl+C', handler: () => this.copySelectedNotes(), enable: () => this.selectedNotes && this.selectedNotes.length > 0 },
      { key: 'paste', label: '粘贴', hint: 'Ctrl+V', handler: () => this.pasteNotes(), enable: () => this.clipboard && this.clipboard.length > 0 },
      { key: 'delete', label: '删除', hint: 'Delete', handler: () => this.deleteSelectedNotes(), enable: () => this.selectedNotes && this.selectedNotes.length > 0 },
      { key: 'divider-1', type: 'divider' },
      { key: 'tone', label: '音色', hint: '', handler: () => {}, enable: () => this.selectedNotes && this.selectedNotes.length > 0 },
      { key: 'velocity', label: '力度', hint: '', handler: () => this.showVelocityInput(), enable: () => this.selectedNotes && this.selectedNotes.length > 0 },
    ];

    // 点击空白处关闭（冒泡阶段）
    document.addEventListener('click', (e) => {
      if (this.contextMenu && this.contextMenu.style.display === 'block') {
        // 若点击在菜单外则关闭
        if (!this.contextMenu.contains(e.target)) {
          this.hideContextMenu();
        }
      }
    });
    // 捕获阶段的全局按下也关闭，确保任何位置（包括canvas）都能关闭
    document.addEventListener('mousedown', (e) => {
      if (!this.contextMenuDisabled && this.contextMenu && this.contextMenu.style.display === 'block') {
        // 检查点击是否发生在主菜单或二级菜单外
        if (!this.contextMenu.contains(e.target) && 
            (!this.toneSubmenu || !this.toneSubmenu.contains(e.target))) {
          this.hideContextMenu();
        }
      }
    }, true);
    
    // 为二级菜单添加独立的点击事件处理
    // 注意：这里可能会干扰单个菜单项的点击事件，所以移除这个监听器
    // if (this.toneSubmenu) {
    //   this.toneSubmenu.addEventListener('click', (e) => {
    //     console.log('二级菜单被点击:', e.target);
    //     e.stopPropagation();
    //   });
    // }
    // 窗口滚动或尺寸变化时关闭
    window.addEventListener('scroll', () => this.hideContextMenu());
    window.addEventListener('resize', () => this.hideContextMenu());
  }

  // 显示右键菜单
  showContextMenu(clientX, clientY) {
    if (!this.contextMenu) return;

    // 构建菜单内容
    this.contextMenu.innerHTML = '';
    for (const item of this.contextMenuItems) {
      if (item.type === 'divider') {
        // 添加分隔线
        const divider = document.createElement('div');
        divider.className = 'editor-context-divider';
        this.contextMenu.appendChild(divider);
        continue;
      }

      const enabled = typeof item.enable === 'function' ? !!item.enable() : true;
      const el = document.createElement('div');
      el.className = 'editor-context-item' + (enabled ? '' : ' disabled');
      const text = document.createElement('span');
      text.className = 'label';
      
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = item.hint || '';
      
      // 特殊处理音色和力度项的显示
      if (item.key === 'tone' && enabled) {
        // 检查选中音符的音色是否统一
        const toneInfo = this.checkUniformProperty('instrument');
        console.log('音色菜单项调试 - toneInfo:', toneInfo);
        text.textContent = '音色';
        
        // 如果音色统一，显示当前音色名称
        if (toneInfo.uniform && toneInfo.value) {
          console.log('音色菜单项调试 - 音色统一，值为:', toneInfo.value);
          const instrumentNames = window.mainController?.instrumentConfig?.getAllInstrumentNames();
          console.log('音色菜单项调试 - instrumentNames:', instrumentNames);
          const instrumentName = instrumentNames ? instrumentNames[toneInfo.value] : toneInfo.value;
          console.log('音色菜单项调试 - 最终音色名称:', instrumentName);
          hint.textContent = instrumentName || toneInfo.value;
        } else {
          console.log('音色菜单项调试 - 音色不统一或无值');
        }
        
        el.dataset.uniformTone = !toneInfo.uniform;
        
        // 悬停时显示音色二级菜单
        el.addEventListener('mouseenter', (e) => {
          this.showToneSubmenu(clientX, clientY);
        });
        el.addEventListener('mouseleave', (e) => {
          // 延迟隐藏，避免快速移动时闪烁
          setTimeout(() => {
            if (!this.toneSubmenu.matches(':hover') && !el.matches(':hover')) {
              this.hideToneSubmenu();
            }
          }, 200);
        });
        
        // 点击音色项时也显示二级菜单
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showToneSubmenu(clientX, clientY);
        });
      } else if (item.key === 'velocity' && enabled) {
        // 检查选中音符的力度是否统一
        const velocityInfo = this.checkUniformProperty('velocity');
        console.log('力度菜单项调试 - velocityInfo:', velocityInfo);
        text.textContent = '力度';
        
        // 如果力度统一，显示当前力度值
        if (velocityInfo.uniform && velocityInfo.value !== null) {
          console.log('力度菜单项调试 - 力度统一，值为:', velocityInfo.value);
          hint.textContent = velocityInfo.value.toString();
        } else {
          console.log('力度菜单项调试 - 力度不统一或无值');
        }
        
        el.dataset.uniformVelocity = !velocityInfo.uniform;
      } else {
        text.textContent = item.label;
      }
      el.appendChild(text);
      el.appendChild(hint);
      
      if (enabled && item.key !== 'tone') {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hideContextMenu();
          this.hideToneSubmenu();
          item.handler();
        });
      }
      this.contextMenu.appendChild(el);
    }

    // 定位并显示
    this.contextMenu.style.left = clientX + 'px';
    this.contextMenu.style.top = clientY + 'px';
    this.contextMenu.style.display = 'block';

    // 防止溢出屏幕
    const rect = this.contextMenu.getBoundingClientRect();
    const dx = Math.max(0, rect.right - window.innerWidth);
    const dy = Math.max(0, rect.bottom - window.innerHeight);
    if (dx > 0) {
      this.contextMenu.style.left = clientX - dx + 'px';
    }
    if (dy > 0) {
      this.contextMenu.style.top = clientY - dy + 'px';
    }
  }

  // 隐藏右键菜单
  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
    this.hideToneSubmenu();
  }

  // 显示音色二级菜单
  showToneSubmenu(clientX, clientY) {
    if (!this.toneSubmenu) {
      console.error('showToneSubmenu: toneSubmenu not initialized');
      return;
    }
    if (!window.mainController) {
      console.error('showToneSubmenu: window.mainController not available');
      return;
    }
    if (!window.mainController.instrumentConfig) {
      console.error('showToneSubmenu: instrumentConfig not available');
      return;
    }

    // 清空二级菜单
    this.toneSubmenu.innerHTML = '';
    
    // 获取音色列表
    const instrumentNames = window.mainController.instrumentConfig.getAllInstrumentNames();
    console.log('showToneSubmenu: Available instruments:', Object.keys(instrumentNames));
    console.log('showToneSubmenu: Instrument names object:', instrumentNames);
    console.log('showToneSubmenu: Instruments count:', Object.keys(instrumentNames).length);
    
    for (const instrumentId in instrumentNames) {
      console.log('showToneSubmenu: Creating menu item for instrumentId:', instrumentId);
      const item = document.createElement('div');
      item.className = 'editor-context-item';
      const text = document.createElement('span');
      text.className = 'label';
      
      // 检查音色是否已加载
      if (window.mainController.audioEngine.loadingManager && 
          window.mainController.audioEngine.loadingManager.isInstrumentLoaded(instrumentId)) {
        // 已加载的音色：正常显示
        text.textContent = instrumentNames[instrumentId];
      } else {
        // 未加载的音色：添加云朵图标前缀
        text.textContent = `☁ ${instrumentNames[instrumentId]}`;
      }
      
      item.appendChild(text);
      item.setAttribute('data-instrument-id', instrumentId);
      
      // 添加点击事件
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const clickedInstrumentId = e.currentTarget.getAttribute('data-instrument-id');
        console.log('音色菜单项被点击，instrumentId:', clickedInstrumentId);
        this.hideContextMenu();
        this.hideToneSubmenu();
        this.moveNotesToInstrument(clickedInstrumentId);
      });
      
      this.toneSubmenu.appendChild(item);
    }
    
    // 定位并显示二级菜单（在主菜单右侧）
    const contextMenuRect = this.contextMenu.getBoundingClientRect();
    this.toneSubmenu.style.left = (contextMenuRect.right + 5) + 'px';
    this.toneSubmenu.style.top = contextMenuRect.top + 'px';
    this.toneSubmenu.style.display = 'block';
    
    // 防止溢出屏幕
    const submenuRect = this.toneSubmenu.getBoundingClientRect();
    if (submenuRect.right > window.innerWidth) {
      this.toneSubmenu.style.left = (contextMenuRect.left - submenuRect.width - 5) + 'px';
    }
    if (submenuRect.bottom > window.innerHeight) {
      this.toneSubmenu.style.top = Math.max(0, window.innerHeight - submenuRect.height) + 'px';
    }
    
    // 为二级菜单添加点击事件捕获，防止冒泡到document
    // 注意：这里可能会干扰单个菜单项的点击事件，所以移除这个监听器
    // this.toneSubmenu.addEventListener('click', (e) => {
    //   e.stopPropagation();
    // }, true);
  }
  
  // 隐藏音色二级菜单
  hideToneSubmenu() {
    if (this.toneSubmenu) {
      this.toneSubmenu.style.display = 'none';
    }
  }
  
  // 检查选中音符的指定属性是否统一，并返回统一值
  checkUniformProperty(property) {
    if (!this.selectedNotes || this.selectedNotes.length === 0) return { uniform: false, value: null };
    
    let firstValue;
    
    // 特殊处理音色属性
    if (property === 'instrument') {
      firstValue = this.selectedNotes[0].track.instrument;
      for (let i = 1; i < this.selectedNotes.length; i++) {
        if (this.selectedNotes[i].track.instrument !== firstValue) {
          return { uniform: false, value: null };
        }
      }
    } else {
      // 其他属性直接从音符获取
      firstValue = this.selectedNotes[0].note[property];
      for (let i = 1; i < this.selectedNotes.length; i++) {
        if (this.selectedNotes[i].note[property] !== firstValue) {
          return { uniform: false, value: null };
        }
      }
    }
    
    return { uniform: true, value: firstValue };
  }
  
  // 将选中的音符移动到指定音色组
  moveNotesToInstrument(instrumentId) {
    console.log('=== moveNotesToInstrument 开始执行 ===');
    console.log('moveNotesToInstrument called with instrumentId:', instrumentId);
    console.log('moveNotesToInstrument: window.mainController exists:', !!window.mainController);
    console.log('moveNotesToInstrument: selectedNotes exists:', !!this.selectedNotes);
    console.log('moveNotesToInstrument: selectedNotes length:', this.selectedNotes ? this.selectedNotes.length : 0);
    
    if (!instrumentId) {
      console.error('moveNotesToInstrument: No instrumentId provided');
      return;
    }
    if (!this.selectedNotes || this.selectedNotes.length === 0) {
      console.log('moveNotesToInstrument: No notes selected to move');
      return;
    }
    
    console.log('moveNotesToInstrument: Selected notes count:', this.selectedNotes.length);
    
    // 保存原始选中音符的完整信息，用于操作完成后重新选中
    const originalSelectedNotes = this.selectedNotes.map(noteRef => ({
      midiNote: noteRef.note.midiNote,
      startTime: noteRef.note.startTime,
      endTime: noteRef.note.endTime,
      velocity: noteRef.note.velocity
    }));
    
    // 获取或创建目标轨道
    console.log('moveNotesToInstrument: Getting or creating track for instrumentId:', instrumentId);
    const targetTrack = this.getOrCreateTrack(instrumentId);
    console.log('moveNotesToInstrument: Target track:', targetTrack);
    
    // 记录需要移动的音符
    const notesToMove = [];
    let skippedNotesCount = 0;
    
    // 遍历所有选中的音符引用
    for (const noteRef of this.selectedNotes) {
      const note = noteRef.note;
      const sourceTrack = noteRef.track;
      
      // 如果音符已经在目标轨道上，跳过
      if (sourceTrack.instrument === instrumentId) {
        skippedNotesCount++;
        continue;
      }
      
      // 创建音符副本
      const noteCopy = {
        midiNote: note.midiNote,
        startTime: note.startTime,
        endTime: note.endTime,
        velocity: note.velocity,
        played: note.played
      };
      
      // 添加到目标轨道
      targetTrack.notes.push(noteCopy);
      
      // 记录需要从源轨道移除的音符
      notesToMove.push({ sourceTrack, noteIndex: noteRef.noteIndex });
    }
    
    console.log('moveNotesToInstrument: Notes to move count:', notesToMove.length);
    console.log('moveNotesToInstrument: Skipped notes (already on target track):', skippedNotesCount);
    
    // 从源轨道移除音符（需要按索引倒序移除，避免索引变化问题）
    console.log('moveNotesToInstrument: Processing notes removal from source tracks...');
    notesToMove.sort((a, b) => b.noteIndex - a.noteIndex).forEach(item => {
      item.sourceTrack.notes.splice(item.noteIndex, 1);
      
      // 如果源轨道为空，从轨道列表中移除
      if (item.sourceTrack.notes.length === 0) {
        const trackIndex = this.tracks.indexOf(item.sourceTrack);
        if (trackIndex !== -1) {
          this.tracks.splice(trackIndex, 1);
          // 从可见音色集合中移除
          this.visibleInstruments.delete(item.sourceTrack.instrument);
          this.updateInstrumentVisibilityPanel();
        }
      }
    });
    
    // 重新选中移动后的音符
    this.selectedNotes = [];
    for (const originalNote of originalSelectedNotes) {
      // 在所有轨道中查找匹配的音符
      for (let trackIndex = 0; trackIndex < this.tracks.length; trackIndex++) {
        const track = this.tracks[trackIndex];
        for (let noteIndex = 0; noteIndex < track.notes.length; noteIndex++) {
          const currentNote = track.notes[noteIndex];
          
          // 检查是否匹配（不比较velocity，因为可能被修改）
          if (originalNote.midiNote === currentNote.midiNote &&
              Math.abs(originalNote.startTime - currentNote.startTime) < 0.001 &&
              Math.abs(originalNote.endTime - currentNote.endTime) < 0.001) {
            
            console.log('Re-selecting moved note:', currentNote.midiNote, 'at track:', track.instrument);
            this.selectedNotes.push(this.createNoteReference(track, noteIndex));
            break; // 找到匹配的音符后跳出内层循环
          }
        }
      }
    }
    
    console.log('After re-selecting: selected notes count:', this.selectedNotes.length);
    
    // 重绘编辑器
    this.draw();
    
    // 如果是未加载的音色，触发加载
    if (window.mainController && 
        !window.mainController.audioEngine.loadingManager.isInstrumentLoaded(instrumentId)) {
      window.mainController.audioEngine.loadInstrumentLazy(instrumentId).catch(err => {
        console.error(`加载音色 ${instrumentId} 失败:`, err);
      });
    }
    
    // 保存操作到历史记录（在操作完成后）
    this.saveToHistory('moveNotesToInstrument');
  }
  
  // 更新选中的音符引用（移动音符后需要更新）
  updateSelectedNoteRefs() {
    const updatedSelectedNotes = [];
    
    console.log('updateSelectedNoteRefs called. Original selected notes count:', this.selectedNotes.length);
    
    // 如果没有选中的音符，直接返回
    if (!this.selectedNotes || this.selectedNotes.length === 0) {
      console.log('No selected notes to update');
      return;
    }
    
    // 为每个原始选中的音符创建一个唯一标识符
    // 注意：我们不包含velocity，因为力度修改后velocity会变化
    const originalNoteIdentifiers = this.selectedNotes
      .filter(noteRef => noteRef && noteRef.note) // 过滤掉无效的引用
      .map(noteRef => ({
        midiNote: noteRef.note.midiNote,
        startTime: noteRef.note.startTime,
        endTime: noteRef.note.endTime
      }));
    
    // 遍历所有轨道和音符，寻找匹配的音符
    for (let trackIndex = 0; trackIndex < this.tracks.length; trackIndex++) {
      const track = this.tracks[trackIndex];
      for (let noteIndex = 0; noteIndex < track.notes.length; noteIndex++) {
        const currentNote = track.notes[noteIndex];
        
        // 检查这个音符是否与原始选中的任何一个音符匹配
        // 注意：这里不比较轨道的instrument ID，因为音符可能被移动到了新轨道
        // 也不比较velocity，因为力度修改后velocity会变化
        const isSelected = originalNoteIdentifiers.some(originalNote => 
          originalNote.midiNote === currentNote.midiNote &&
          Math.abs(originalNote.startTime - currentNote.startTime) < 0.001 &&
          Math.abs(originalNote.endTime - currentNote.endTime) < 0.001
        );
        
        if (isSelected) {
          console.log('Found matching note:', currentNote.midiNote, 'at track:', track.instrument);
          updatedSelectedNotes.push(this.createNoteReference(track, noteIndex));
        }
      }
    }
    
    console.log('updateSelectedNoteRefs: Updated selected notes count:', updatedSelectedNotes.length);
    
    this.selectedNotes = updatedSelectedNotes;
  }
  
  // 初始化自定义对话框
  initCustomDialog() {
    if (this.customDialog) return;
    
    // 创建对话框遮罩
    this.dialogOverlay = document.createElement('div');
    this.dialogOverlay.className = 'custom-dialog-overlay';
    this.dialogOverlay.style.position = 'fixed';
    this.dialogOverlay.style.top = '0';
    this.dialogOverlay.style.left = '0';
    this.dialogOverlay.style.width = '100%';
    this.dialogOverlay.style.height = '100%';
    this.dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.dialogOverlay.style.zIndex = '20000';
    this.dialogOverlay.style.display = 'none';
    
    // 创建对话框容器
    this.customDialog = document.createElement('div');
    this.customDialog.className = 'custom-dialog';
    this.customDialog.style.position = 'fixed';
    this.customDialog.style.left = '50%';
    this.customDialog.style.top = '50%';
    this.customDialog.style.transform = 'translate(-50%, -50%)';
    this.customDialog.style.backgroundColor = '#252525';
    this.customDialog.style.border = '1px solid #444';
    this.customDialog.style.borderRadius = '6px';
    this.customDialog.style.padding = '20px';
    this.customDialog.style.minWidth = '300px';
    this.customDialog.style.zIndex = '20001';
    this.customDialog.style.display = 'none';
    
    // 添加到document
    document.body.appendChild(this.dialogOverlay);
    document.body.appendChild(this.customDialog);
    
    // 点击遮罩关闭对话框
    this.dialogOverlay.addEventListener('click', () => {
      this.hideCustomDialog();
    });
  }
  
  // 显示自定义对话框
  showCustomDialog(title, message, inputPlaceholder, onConfirm) {
    this.initCustomDialog();
    
    // 设置对话框显示标志
    this.isCustomDialogOpen = true;
    
    // 禁用整个页面的交互
    this.disablePageInteraction();
    
    // 清空对话框内容
    this.customDialog.innerHTML = '';
    
    // 设置标题
    const titleElement = document.createElement('h3');
    titleElement.style.color = '#e0e0e0';
    titleElement.style.margin = '0 0 15px 0';
    titleElement.textContent = title;
    this.customDialog.appendChild(titleElement);
    
    // 设置消息
    const messageElement = document.createElement('p');
    messageElement.style.color = '#e0e0e0';
    messageElement.style.margin = '0 0 15px 0';
    messageElement.textContent = message;
    this.customDialog.appendChild(messageElement);
    
    // 如果需要输入框
    if (inputPlaceholder) {
      const inputContainer = document.createElement('div');
      inputContainer.style.marginBottom = '15px';
      
      const inputElement = document.createElement('input');
      inputElement.type = 'number';
      inputElement.style.width = '100%';
      inputElement.style.padding = '8px';
      inputElement.style.backgroundColor = '#1a1a1a';
      inputElement.style.border = '1px solid #444';
      inputElement.style.borderRadius = '4px';
      inputElement.style.color = '#e0e0e0';
      inputElement.placeholder = inputPlaceholder;
      inputElement.min = '0';
      inputElement.max = '100';
      
      inputContainer.appendChild(inputElement);
      this.customDialog.appendChild(inputContainer);
    }
    
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    
    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消';
    cancelButton.style.padding = '8px 15px';
    cancelButton.style.backgroundColor = '#444';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.color = '#e0e0e0';
    cancelButton.style.cursor = 'pointer';
    
    cancelButton.addEventListener('click', () => {
      this.hideCustomDialog();
    });
    
    // 创建确认按钮
    const confirmButton = document.createElement('button');
    confirmButton.textContent = '确认';
    confirmButton.style.padding = '8px 15px';
    confirmButton.style.backgroundColor = '#007acc';
    confirmButton.style.border = 'none';
    confirmButton.style.borderRadius = '4px';
    confirmButton.style.color = 'white';
    confirmButton.style.cursor = 'pointer';
    
    confirmButton.addEventListener('click', () => {
      let inputValue = null;
      if (inputPlaceholder) {
        const inputElement = this.customDialog.querySelector('input');
        inputValue = inputElement.value;
      }
      
      this.hideCustomDialog();
      
      if (onConfirm) {
        onConfirm(inputValue);
      }
    });
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    this.customDialog.appendChild(buttonContainer);
    
    // 显示对话框
    this.dialogOverlay.style.display = 'block';
    this.customDialog.style.display = 'block';
    
    // 聚焦输入框
    const inputElement = this.customDialog.querySelector('input');
    if (inputElement) {
      inputElement.focus();
    }
  }
  
  // 隐藏自定义对话框
  hideCustomDialog() {
    if (this.dialogOverlay && this.customDialog) {
      this.dialogOverlay.style.display = 'none';
      this.customDialog.style.display = 'none';
    }
    // 清除对话框显示标志
    this.isCustomDialogOpen = false;
    
    // 恢复整个页面的交互
    this.enablePageInteraction();
  }
  
  // 禁用整个页面的交互
  disablePageInteraction() {
    // 禁用canvas的交互
    this.canvas.style.pointerEvents = 'none';
    
    // 禁用键盘事件
    this.keyboardEventsDisabled = true;
    
    // 禁用全局点击事件
    this.globalClickDisabled = true;
    
    // 禁用右键菜单
    this.contextMenuDisabled = true;
  }
  
  // 恢复整个页面的交互
  enablePageInteraction() {
    // 恢复canvas的交互
    this.canvas.style.pointerEvents = 'auto';
    
    // 恢复键盘事件
    this.keyboardEventsDisabled = false;
    
    // 恢复全局点击事件
    this.globalClickDisabled = false;
    
    // 恢复右键菜单
    this.contextMenuDisabled = false;
  }
  
  // 显示力度输入对话框
  showVelocityInput() {
    if (!this.selectedNotes || this.selectedNotes.length === 0) return;
    
    // 保存原始选中音符信息，用于对话框关闭后重新选中
    const originalSelectedNotes = this.selectedNotes.map(noteRef => ({
      midiNote: noteRef.note.midiNote,
      startTime: noteRef.note.startTime,
      endTime: noteRef.note.endTime,
      velocity: noteRef.note.velocity
    }));
    
    // 使用自定义对话框替代prompt
    this.showCustomDialog(
      '设置力度',
      '请输入力度值 (0-100)',
      '力度值',
      (velocity) => {
        // 验证输入
        if (velocity !== null && velocity !== undefined) {
          const velocityValue = parseInt(velocity, 10);
          if (!isNaN(velocityValue) && velocityValue >= 0 && velocityValue <= 100) {
            // 保存操作到历史记录
            this.saveToHistory('changeVelocity');
            
            // 更新所有选中音符的力度
            for (const noteRef of this.selectedNotes) {
              noteRef.note.velocity = velocityValue;
            }
            
            // 延迟重新选中音符，确保对话框完全关闭后再执行
            setTimeout(() => {
              // 重新选中音符以确保选中状态正确
              this.selectedNotes = [];
              for (const originalNote of originalSelectedNotes) {
                // 在所有轨道中查找匹配的音符
                for (let trackIndex = 0; trackIndex < this.tracks.length; trackIndex++) {
                  const track = this.tracks[trackIndex];
                  for (let noteIndex = 0; noteIndex < track.notes.length; noteIndex++) {
                    const currentNote = track.notes[noteIndex];
                    
                    // 检查是否匹配（不比较velocity，因为刚刚被修改）
                    if (originalNote.midiNote === currentNote.midiNote &&
                        Math.abs(originalNote.startTime - currentNote.startTime) < 0.001 &&
                        Math.abs(originalNote.endTime - currentNote.endTime) < 0.001) {
                      
                      console.log('Re-selecting velocity-changed note:', currentNote.midiNote, 'at track:', track.instrument);
                      this.selectedNotes.push(this.createNoteReference(track, noteIndex));
                      break; // 找到匹配的音符后跳出内层循环
                    }
                  }
                }
              }
              
              console.log('Velocity change completed, re-selected notes count:', this.selectedNotes.length);
              
              // 重绘编辑器
              this.draw();
            }, 100); // 延迟100ms确保对话框完全关闭
          } else if (velocity.trim() !== '') {
            // 显示错误提示
            this.showCustomDialog(
              '输入错误',
              '请输入有效的力度值 (0-100)',
              null,
              () => {
                // 错误提示关闭后，延迟重新显示力度输入框，确保选中状态正确
                setTimeout(() => {
                  this.showVelocityInput();
                }, 100);
              }
            );
          }
        }
      }
    );
  }

  // 是否可撤回
  canUndo() {
    return this.history && this.currentHistoryIndex > 0;
  }

  // 是否可恢复
  canRedo() {
    return this.history && this.currentHistoryIndex < this.history.length - 1;
  }
  // 获取音符颜色
  getNoteColor(instrumentId) {
    if (!this.instrumentConfig || !instrumentId) {
      return '#00ccff'; // 默认颜色
    }
    
    // 直接从配置中获取颜色，不依赖于音色加载
    const instrument = this.instrumentConfig.instruments[instrumentId];
    return instrument?.color || '#00ccff';
  }

  // 获取比给定颜色深一点的颜色
  getDarkerColor(hexColor) {
    // 解析十六进制颜色
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // 将颜色变暗（减少亮度）
    const darkenFactor = 0.7; // 70% 的亮度
    const darkerR = Math.floor(r * darkenFactor);
    const darkerG = Math.floor(g * darkenFactor);
    const darkerB = Math.floor(b * darkenFactor);
    
    // 转换回十六进制
    const toHex = (c) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(darkerR)}${toHex(darkerG)}${toHex(darkerB)}`;
  }



  // 获取或创建轨道
  getOrCreateTrack(instrumentId) {
    let track = this.tracks.find(t => t.instrument === instrumentId);
    if (!track) {
      track = {
        instrument: instrumentId,
        notes: []
      };
      this.tracks.push(track);
      // 默认显示所有音色
      this.visibleInstruments.add(instrumentId);
      // 更新音色显示控制面板
      this.updateInstrumentVisibilityPanel();
    }
    return track;
  }

  // 添加音符到轨道
  addNoteToTrack(note, startTime, endTime, velocity, instrumentId) {
    const track = this.getOrCreateTrack(instrumentId);
    const newNote = {
      midiNote: note,
      startTime: startTime,
      endTime: endTime,
      velocity: velocity,
      played: false
    };
    track.notes.push(newNote);
    
    // 如果是新轨道，更新音色显示控制面板（触发添加动画）
    if (track.notes.length === 1) {
      this.updateInstrumentVisibilityPanel();
    }
  }

  // 音符引用结构
  createNoteReference(track, noteIndex) {
    return {
      track: track,
      noteIndex: noteIndex,
      get note() { return this.track.notes[this.noteIndex]; },
      get midiNote() { return this.note.midiNote; },
      get startTime() { return this.note.startTime; },
      get endTime() { return this.note.endTime; },
      get velocity() { return this.note.velocity; },
      get instrument() { return this.track.instrument; },
      set midiNote(value) { this.note.midiNote = value; },
      set startTime(value) { this.note.startTime = value; },
      set endTime(value) { this.note.endTime = value; },
      set velocity(value) { this.note.velocity = value; }
    };
  }

  // 比较两个音符引用是否相同
  isSameNoteRef(ref1, ref2) {
    return ref1.track === ref2.track && ref1.noteIndex === ref2.noteIndex;
  }

  // 在选中列表中查找音符引用的索引
  findNoteRefIndex(noteRef) {
    return this.selectedNotes.findIndex(selectedRef => this.isSameNoteRef(selectedRef, noteRef));
  }

  // 重置所有交互状态
  resetInteractionState() {
    this.isEditing = false;
    this.isSelecting = false;
    this.hasDragged = false;
    this.pendingDeselect = null;
    this.dragReferenceNote = null; // 清除拖拽基准音符
    this.pendingPlayheadPosition = undefined;
    this.dragType = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.selectionStartX = 0;
    this.selectionStartY = 0;
    this.selectionEndX = 0;
    this.selectionEndY = 0;
    this.previewPlayheadPosition = -1;
    
    // 恢复默认鼠标样式
    this.canvas.style.cursor = 'default';
  }

  // 获取鼠标在canvas中的坐标
  getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // 判断是否为原地点击（移动距离小于阈值）
  isClickInPlace(startPos, endPos, threshold = 5) {
    const deltaX = Math.abs(endPos.x - startPos.x);
    const deltaY = Math.abs(endPos.y - startPos.y);
    return deltaX < threshold && deltaY < threshold;
  }

  // 禁用页面中的所有框选
  disablePageSelection() {
    // 禁用整个页面的文本选择
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
    
    // 禁用拖拽选择
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
    
    // 禁用右键菜单（可选）
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // 为所有元素添加CSS样式禁用选择
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 处理悬浮容器的拖拽事件
  handleFloatingContainers() {
    // 获取canvas的父容器
    const canvasParent = this.canvas.parentElement;
    
    // 查找所有悬浮在父容器上的元素
    const floatingElements = canvasParent.querySelectorAll('*');
    
    floatingElements.forEach(element => {
      // 跳过canvas本身
      if (element === this.canvas) return;
      
      // 检查元素是否悬浮（position: absolute 或 fixed）
      const style = window.getComputedStyle(element);
      if (style.position === 'absolute' || style.position === 'fixed') {
        this.setupFloatingElement(element);
      }
    });
    
    // 监听DOM变化，处理动态添加的悬浮元素
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const style = window.getComputedStyle(node);
            if (style.position === 'absolute' || style.position === 'fixed') {
              this.setupFloatingElement(node);
            }
          }
        });
      });
    });
    
    observer.observe(canvasParent, {
      childList: true,
      subtree: true
    });

    // 自定义右键菜单：阻止默认并展示菜单
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });
  }

  // 为悬浮元素设置事件处理
  setupFloatingElement(element) {
    // 检查元素是否是可点击的（按钮、链接等）
    const isClickable = element.tagName === 'BUTTON' || 
                       element.tagName === 'A' || 
                       element.onclick || 
                       element.classList.contains('clickable') ||
                       element.getAttribute('role') === 'button';
    
    // 阻止拖拽开始事件
    element.addEventListener('mousedown', (e) => {
      // 如果是可点击元素，不阻止事件传播
      if (isClickable) {
        return;
      }
      
      // 阻止默认的拖拽行为
      e.stopPropagation();
      
      // 如果按下鼠标，立即开始canvas的框选
      if (!this.isRecording && !this.isPlaying) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const pos = {
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top
        };
        
        // 开始框选
        this.startSelection(pos, e.ctrlKey);
      }
    });
    
    // 阻止拖拽事件
    element.addEventListener('dragstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    // 阻止选择事件
    element.addEventListener('selectstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // 处理音符点击
  handleNoteClick(noteRef, pos, isCtrlKey) {
    if (isCtrlKey) {
      // Ctrl键按下时，切换音符的选中状态
      const index = this.findNoteRefIndex(noteRef);
      if (index > -1) {
        // 如果已选中，则取消选中
        this.selectedNotes.splice(index, 1);
      } else {
        // 如果未选中，则添加到选中列表
        this.selectedNotes.push(noteRef);
      }
      this.draw();
      this.updateInfoDisplay();
    } else {
      // 没有按住Ctrl键时，检查是否点击了已选中的音符
      const index = this.findNoteRefIndex(noteRef);
      if (index > -1) {
        // 如果已选中，标记为待取消选中，并设置为编辑状态
        this.pendingDeselect = noteRef;
        this.selectNote(noteRef, pos.x, pos.y);
      } else {
        // 否则清空之前的选中并选中当前音符
        this.selectedNotes = [noteRef];
        this.selectNote(noteRef, pos.x, pos.y);
      }
      this.updateInfoDisplay();
    }
  }

  // 开始框选
  startSelection(pos, isCtrlKey) {
    // 如果没有按住Ctrl键则取消所有选中
    if (!isCtrlKey && this.selectedNotes.length > 0) {
      this.selectedNotes = [];
      this.draw();
      this.updateInfoDisplay();
    }
    
    // 开始框选
    this.isSelecting = true;
    this.selectionStartX = pos.x;
    this.selectionStartY = pos.y;
    this.selectionEndX = pos.x;
    this.selectionEndY = pos.y;
    
    // 标记播放头位置，等待mouseup事件
    this.pendingPlayheadPosition = pos.x;
  }

  // 更新框选状态
  updateSelection(pos) {
    this.selectionEndX = pos.x;
    this.selectionEndY = pos.y;
    
    // 设置鼠标样式为十字
    this.canvas.style.cursor = 'crosshair';
    
    // 重置悬停状态
    this.hoveredNote = null;
    
    // 重绘
    this.draw();
  }

  // 更新悬停状态
  updateHover(pos) {
    const hoveredNote = this.getNoteAtPosition(pos.x, pos.y);
    
    if (hoveredNote) {
      // 计算音符的位置信息
      const note = hoveredNote.note;
      const noteX = note.startTime * this.pixelsPerBeat;
      const noteWidth = (note.endTime - note.startTime) * this.pixelsPerBeat;
      
      // 根据鼠标位置设置不同的光标样式
      if (pos.x < noteX + 5) {
        // 鼠标在左边缘
        // 多选状态下也显示拉伸光标，支持批量拉伸
        this.canvas.style.cursor = 'w-resize';
      } else if (pos.x > noteX + noteWidth - 5) {
        // 鼠标在右边缘
        // 多选状态下也显示拉伸光标，支持批量拉伸
        this.canvas.style.cursor = 'e-resize';
      } else {
        // 鼠标在音符内部，设置为手指箭头
        this.canvas.style.cursor = 'pointer';
      }
    } else {
      // 恢复默认鼠标样式
      this.canvas.style.cursor = 'default';
      
      // 更新预览播放头位置
      this.previewPlayheadPosition = pos.x;
      this.draw();
    }
    
    // 保存悬停状态用于绘制
    this.hoveredNote = hoveredNote;
  }

  // 处理鼠标释放事件
  handleMouseUp(e) {
    // 如果自定义对话框打开，不处理鼠标事件
    if (this.isCustomDialogOpen) {
      return;
    }
    
    if (this.isSelecting) {
      // 处理框选结束
      this.handleSelectionEnd();
    } else if (this.isEditing) {
      // 处理拖拽结束
      this.finishDrag();
    }
    
    // 检查是否需要保存历史状态（释放选中状态）
    this.checkForSelectionRelease();
  }

  // 处理框选结束
  handleSelectionEnd() {
    const startPos = { x: this.selectionStartX, y: this.selectionStartY };
    const endPos = { x: this.selectionEndX, y: this.selectionEndY };
    
    if (this.isClickInPlace(startPos, endPos)) {
      // 原地点击
      if (this.isMouseInputEnabled && this.isMousePressed) {
        // 鼠标输入功能开启，处理音符创建
        this.endMouseInputNote();
      } else {
        // 默认行为：更新播放头位置
        this.setPlayheadPosition(this.pendingPlayheadPosition, true);
      }
    } else {
      // 拖拽：完成框选
      if (this.isMouseInputEnabled && this.isMousePressed) {
        // 鼠标输入功能开启，鼠标移动时结束音符创建
        this.endMouseInputNote();
      } else {
        // 默认行为：完成框选
        this.finishSelection();
      }
    }
    
    // 重置框选状态
    this.isSelecting = false;
  }



  // 预加载需要的音色
  async preloadRequiredInstruments(instrumentIds) {
    const loadPromises = instrumentIds.map(async (instrumentId) => {
      try {
        // 检查音色是否已经加载
        if (!this.audioEngine.synths[instrumentId]) {
          console.log(`预加载音色: ${instrumentId}`);
          await this.audioEngine.loadInstrumentLazy(instrumentId);
        }
      } catch (error) {
        console.error(`预加载音色 ${instrumentId} 失败:`, error);
      }
    });
    
    await Promise.all(loadPromises);
    console.log('音色预加载完成');
  }

  // 异步预加载音色（不阻塞UI）
  async preloadInstrumentsAsync(notes) {
    // 收集需要预加载的音色
    const requiredInstruments = new Set();
    for (const note of notes) {
      if (note.instrument) {
        requiredInstruments.add(note.instrument);
      }
    }
    
    // 如果有需要预加载的音色，异步加载
    if (requiredInstruments.size > 0) {
      console.log(`开始异步预加载音色: ${Array.from(requiredInstruments).join(', ')}`);
      
      // 使用setTimeout确保不阻塞UI
      setTimeout(async () => {
        try {
          await this.preloadRequiredInstruments(Array.from(requiredInstruments));
          console.log('异步音色预加载完成');
        } catch (error) {
          console.error('异步音色预加载失败:', error);
        }
      }, 0);
    }
  }

  // 创建音色显示控制面板
  createInstrumentVisibilityPanel() {
    // 创建面板容器
    this.instrumentVisibilityPanel = document.createElement('div');
    this.instrumentVisibilityPanel.className = 'instrument-visibility-panel';
    this.instrumentVisibilityPanel.style.cssText = `
      position: absolute;
      top: 95px;
      left: 30px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
      justify-content: flex-start;
      padding: 8px 10px;
      background-color: transparent;
      border: none;
      margin-top: 5px;
      z-index: 1000;
      pointer-events: auto;
      max-height: calc(100vh - 150px);
      overflow-y: auto;
    `;
    
    // 添加到MIDI编辑器容器中，在控制栏下面
    const editorContainer = document.querySelector('.midi-editor-container');
    if (editorContainer) {
      // 找到控制栏
      const controlsContainer = editorContainer.querySelector('.midi-editor-controls');
      if (controlsContainer) {
        // 在控制栏后插入音色面板
        controlsContainer.parentNode.insertBefore(this.instrumentVisibilityPanel, controlsContainer.nextSibling);
      }
    }
  }

  // 更新音色显示控制面板
  updateInstrumentVisibilityPanel() {
    if (!this.instrumentVisibilityPanel) return;
    
    // 获取当前存在的按钮
    const existingButtons = Array.from(this.instrumentVisibilityPanel.children);
    const currentInstrumentIds = new Set(this.tracks.map(track => track.instrument));
    
    // 找出需要删除的按钮（轨道已删除的音色）
    const buttonsToRemove = existingButtons.filter(button => {
      const instrumentId = button.dataset.instrumentId;
      return !currentInstrumentIds.has(instrumentId);
    });
    
    // 找出需要添加的音色（新轨道）
    const existingInstrumentIds = new Set(existingButtons.map(button => button.dataset.instrumentId));
    const instrumentsToAdd = this.tracks.filter(track => !existingInstrumentIds.has(track.instrument));
    
    // 找出需要更新的按钮（状态变化）
    const buttonsToUpdate = existingButtons.filter(button => {
      const instrumentId = button.dataset.instrumentId;
      const track = this.tracks.find(t => t.instrument === instrumentId);
      if (!track) return false;
      
      const isVisible = this.visibleInstruments.has(instrumentId);
      const currentVisible = button.classList.contains('visible');
      return isVisible !== currentVisible;
    });
    
    // 检查按钮顺序是否需要调整
    const needsReorder = this.checkButtonOrderNeedsUpdate(existingButtons);
    
    // 删除不需要的按钮（带动画）
    buttonsToRemove.forEach(button => {
      button.style.transform = 'scale(0)';
      button.style.opacity = '0';
      setTimeout(() => {
        if (button.parentNode) {
          button.parentNode.removeChild(button);
        }
      }, 200);
    });
    
    // 更新现有按钮状态
    buttonsToUpdate.forEach(button => {
      const instrumentId = button.dataset.instrumentId;
      const isVisible = this.visibleInstruments.has(instrumentId);
      const color = this.getNoteColor(instrumentId);
      
      // 更新样式
      button.style.backgroundColor = color;
      button.style.borderColor = isVisible ? this.getDarkerColor(color) : '#666';
      button.style.opacity = isVisible ? '1' : '0.5';
      
      // 更新类名
      if (isVisible) {
        button.classList.add('visible');
        button.classList.remove('hidden');
      } else {
        button.classList.add('hidden');
        button.classList.remove('visible');
      }
      
      // 更新斜杠显示
      const slash = button.querySelector('.slash');
      if (isVisible) {
        if (slash) slash.remove();
      } else {
        if (!slash) {
          const newSlash = document.createElement('div');
          newSlash.className = 'slash';
          newSlash.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            width: 2px;
            height: 18px;
            background-color: #666;
            transition: all 0.2s ease;
          `;
          button.appendChild(newSlash);
        } else {
          // 更新现有斜杠的颜色和长度
          slash.style.height = '18px';
          slash.style.backgroundColor = '#666';
        }
      }
      
      // 确保现有按钮也有悬浮提示功能
      this.ensureButtonHoverEvents(button, instrumentId);
    });
    
    // 添加新的按钮（带动画）
    instrumentsToAdd.forEach(track => {
      const instrumentId = track.instrument;
      const isVisible = this.visibleInstruments.has(instrumentId);
      const color = this.getNoteColor(instrumentId);
      
      const button = document.createElement('div');
      button.className = `instrument-visibility-button ${isVisible ? 'visible' : 'hidden'}`;
      button.dataset.instrumentId = instrumentId;
      button.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid ${isVisible ? this.getDarkerColor(color) : '#666'};
        cursor: pointer;
        position: relative;
        transition: all 0.3s ease;
        opacity: ${isVisible ? '1' : '0.5'};
        flex-shrink: 0;
        transform: scale(0);
      `;
      
      // 如果不可见，添加斜杠
      if (!isVisible) {
        button.innerHTML = `
          <div class="slash" style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            width: 2px;
            height: 18px;
            background-color: #666;
            transition: all 0.2s ease;
          "></div>
        `;
      }
      
      // 添加点击事件
      button.addEventListener('click', () => {
        this.toggleInstrumentVisibility(instrumentId);
      });
      
      // 添加右键事件 - 只显示当前音色，隐藏其他所有音色
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        this.showOnlyInstrument(instrumentId);
      });
      
      // 添加悬停效果
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.2)';
        
        // 显示音色名称提示
        this.showInstrumentTooltip(button, instrumentId);
        
        // 高亮对应音色的音符
        this.highlightInstrumentNotes(instrumentId, true);
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        
        // 隐藏音色名称提示
        this.hideInstrumentTooltip();
        
        // 取消高亮对应音色的音符
        this.highlightInstrumentNotes(instrumentId, false);
      });
      
      // 添加拖拽功能
      this.setupDragAndDrop(button);
      
      this.instrumentVisibilityPanel.appendChild(button);
      
      // 触发进入动画
      requestAnimationFrame(() => {
        button.style.transform = 'scale(1)';
      });
    });
    
    // 注意：不再在面板为空时重复创建所有按钮，避免初始化时重复元素
    
    // 如果需要重新排列按钮顺序，执行重新排列
    if (needsReorder) {
      this.reorderButtonsToMatchTracks();
    }
  }

  // 显示音色名称提示
  showInstrumentTooltip(button, instrumentId) {
    // 清除之前的隐藏定时器
    if (this.tooltipHideTimer) {
      clearTimeout(this.tooltipHideTimer);
      this.tooltipHideTimer = null;
    }
    
    // 如果已有提示，直接更新内容
    if (this.currentTooltip) {
      const instrumentName = this.getInstrumentName(instrumentId);
      this.currentTooltip.innerHTML = `
        <div>${instrumentName}</div>
        <div style="font-size: 10px; color: #aaa; margin-top: 2px;">单击: 切换显示 | 右键: 只显示此音色</div>
      `;
      
      // 更新位置
      const buttonRect = button.getBoundingClientRect();
      const tooltipX = buttonRect.right + 10;
      const tooltipY = buttonRect.top + buttonRect.height / 2;
      
      this.currentTooltip.style.left = tooltipX + 'px';
      this.currentTooltip.style.top = tooltipY + 'px';
      this.currentTooltip.style.opacity = '1';
      return;
    }
    
    // 获取音色名称
    const instrumentName = this.getInstrumentName(instrumentId);
    
    // 创建提示元素
    this.currentTooltip = document.createElement('div');
    this.currentTooltip.className = 'instrument-tooltip';
    this.currentTooltip.innerHTML = `
      <div>${instrumentName}</div>
      <div style="font-size: 10px; color: #aaa; margin-top: 2px;">单击: 切换显示 | 右键: 只显示此音色</div>
    `;
    this.currentTooltip.style.cssText = `
      position: fixed;
      background-color: #252525;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Arial', sans-serif;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    // 添加到页面
    document.body.appendChild(this.currentTooltip);
    
    // 计算位置（在按钮右侧显示）
    const buttonRect = button.getBoundingClientRect();
    const tooltipX = buttonRect.right + 10;
    const tooltipY = buttonRect.top + buttonRect.height / 2;
    
    this.currentTooltip.style.left = tooltipX + 'px';
    this.currentTooltip.style.top = tooltipY + 'px';
    this.currentTooltip.style.transform = 'translateY(-50%)';
    
    // 显示提示
    requestAnimationFrame(() => {
      this.currentTooltip.style.opacity = '1';
    });
  }

  // 隐藏音色名称提示
  hideInstrumentTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.style.opacity = '0';
      this.tooltipHideTimer = setTimeout(() => {
        if (this.currentTooltip && this.currentTooltip.parentNode) {
          this.currentTooltip.parentNode.removeChild(this.currentTooltip);
        }
        this.currentTooltip = null;
        this.tooltipHideTimer = null;
      }, 200);
    }
  }

  // 高亮指定音色的音符
  highlightInstrumentNotes(instrumentId, highlight) {
    // 设置高亮状态
    this.highlightedInstrument = highlight ? instrumentId : null;
    
    // 重新绘制画布以显示高光效果
    this.draw();
  }

  // 获取音色名称
  getInstrumentName(instrumentId) {
    // 尝试从主控制器获取音色配置
    if (window.mainController && window.mainController.instrumentConfig) {
      return window.mainController.instrumentConfig.getInstrumentName(instrumentId);
    }
    
    // 如果无法获取，返回音色ID
    return instrumentId;
  }

  // 确保按钮有悬浮事件
  ensureButtonHoverEvents(button, instrumentId) {
    // 移除现有的事件监听器（避免重复）
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // 重新添加点击事件
    newButton.addEventListener('click', () => {
      this.toggleInstrumentVisibility(instrumentId);
    });
    
    // 重新添加右键事件 - 只显示当前音色，隐藏其他所有音色
    newButton.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // 阻止默认右键菜单
      this.showOnlyInstrument(instrumentId);
    });
    
    // 添加悬浮事件
    newButton.addEventListener('mouseenter', () => {
      newButton.style.transform = 'scale(1.2)';
      
      // 显示音色名称提示
      this.showInstrumentTooltip(newButton, instrumentId);
      
      // 高亮对应音色的音符
      this.highlightInstrumentNotes(instrumentId, true);
    });
    
    newButton.addEventListener('mouseleave', () => {
      newButton.style.transform = 'scale(1)';
      
      // 隐藏音色名称提示
      this.hideInstrumentTooltip();
      
      // 取消高亮对应音色的音符
      this.highlightInstrumentNotes(instrumentId, false);
    });
    
    // 重新添加拖拽功能
    this.setupDragAndDrop(newButton);
  }
  
  // 设置拖拽排序功能
  setupDragAndDrop(button) {
    let isDragging = false;
    let draggedButton = null;
    let originalX = 0;
    let originalY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let ghostElement = null;
    let parent = this.instrumentVisibilityPanel;
    let originalOpacity = ''; // 保存原始透明度
    let originalBorderColor = ''; // 保存原始边框颜色
    let originalPosition = ''; // 保存原始定位
    let originalZIndex = ''; // 保存原始层级
    
    // 鼠标按下事件 - 开始拖拽
    button.addEventListener('mousedown', (e) => {
      // 只有按下左键才开始拖拽
      if (e.button !== 0) return;
      
      // 阻止默认行为，避免文本选择等
      e.preventDefault();
      
      isDragging = true;
      draggedButton = button;
      
      // 计算鼠标相对于按钮的偏移量
      const rect = button.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      
      // 存储原始状态
      originalX = button.style.left || '';
      originalY = button.style.top || '';
      originalOpacity = button.style.opacity || '';
      originalBorderColor = button.style.borderColor || '';
      originalPosition = button.style.position || '';
      originalZIndex = button.style.zIndex || '';
      
      // 添加全局事件监听
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    // 创建幽灵元素
    function createGhostElement() {
      ghostElement = document.createElement('div');
      ghostElement.className = 'ghost-drag-element';
      
      // 根据按钮的隐藏状态设置幽灵元素的样式
      const isHidden = button.classList.contains('hidden');
      const baseOpacity = isHidden ? 0.5 : 1;
      const borderColor = isHidden ? '#666' : '#00ccff';
      
      ghostElement.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${button.style.backgroundColor};
        border: 2px solid ${borderColor};
        box-shadow: 0 0 10px rgba(0, 204, 255, 0.7);
        position: fixed;
        z-index: 3000;
        pointer-events: none;
        opacity: ${baseOpacity * 0.9};
      `;
      
      // 如果按钮是隐藏状态，添加斜杠
      if (isHidden) {
        const slash = document.createElement('div');
        slash.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 2px;
          height: 18px;
          background-color: #666;
          transition: all 0.2s ease;
        `;
        ghostElement.appendChild(slash);
      }
      
      document.body.appendChild(ghostElement);
    }
    
    // 鼠标移动事件 - 拖动中
    function onMouseMove(e) {
      if (!isDragging || !draggedButton) return;
      
      // 只有在鼠标移动一定距离后才开始拖拽
      const deltaX = e.clientX - (button.getBoundingClientRect().left + offsetX);
      const deltaY = e.clientY - (button.getBoundingClientRect().top + offsetY);
      
      // 如果是第一次移动且移动距离超过阈值，则开始拖拽
      if (!ghostElement && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        // 设置按钮为相对定位，但保持原始透明度
        button.style.position = 'relative';
        button.style.zIndex = '2000';
        // 不改变透明度，保持原始状态（包括隐藏状态的0.5透明度）
        
        // 创建幽灵元素作为拖拽指示器
        createGhostElement();
        
        // 设置按钮为半透明，让用户知道正在拖拽
        button.style.opacity = '0.3';
      }
      
      // 如果已经有幽灵元素，则更新其位置
      if (ghostElement) {
        // 更新幽灵元素位置
        ghostElement.style.left = (e.clientX - 12) + 'px';
        ghostElement.style.top = (e.clientY - 12) + 'px';
        
        // 找到当前鼠标下的目标按钮
        const currentButton = findButtonAtPosition(e.clientX, e.clientY);
        
        // 如果找到了另一个按钮且不是正在拖拽的按钮，则考虑交换位置
        if (currentButton && currentButton !== draggedButton) {
          const buttons = Array.from(parent.children);
          const draggedIndex = buttons.indexOf(draggedButton);
          const targetIndex = buttons.indexOf(currentButton);
          
          // 只有当拖拽到了新的位置才进行重排序
          if (draggedIndex !== -1 && targetIndex !== -1) {
            // 重新排序DOM元素
            if (draggedIndex < targetIndex) {
              parent.insertBefore(draggedButton, currentButton.nextSibling);
            } else {
              parent.insertBefore(draggedButton, currentButton);
            }
          }
        }
      }
    }
    
    // 鼠标松开事件 - 结束拖拽
    function onMouseUp() {
      if (!isDragging || !draggedButton) return;
      
      // 恢复按钮原始状态
      draggedButton.style.position = originalPosition;
      draggedButton.style.zIndex = originalZIndex;
      draggedButton.style.opacity = originalOpacity;
      draggedButton.style.borderColor = originalBorderColor;
      draggedButton.style.left = originalX;
      draggedButton.style.top = originalY;
      
      // 移除幽灵元素
      if (ghostElement && ghostElement.parentNode) {
        ghostElement.parentNode.removeChild(ghostElement);
        ghostElement = null;
      }
      
      // 更新tracks数组顺序以反映DOM顺序
      updateTracksOrder();
      
      // 清理拖拽状态
      isDragging = false;
      draggedButton = null;
      
      // 移除全局事件监听
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    // 查找指定位置的按钮
    function findButtonAtPosition(x, y) {
      const buttons = Array.from(parent.children);
      for (const btn of buttons) {
        if (btn === draggedButton) continue;
        
        const rect = btn.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return btn;
        }
      }
      return null;
    }
    
    // 更新tracks数组顺序以匹配DOM顺序
    function updateTracksOrder() {
      const buttons = Array.from(parent.children);
      const newTracksOrder = [];
      
      // 按照DOM顺序创建新的轨道数组
      for (const button of buttons) {
        const instrumentId = button.dataset.instrumentId;
        const track = this.tracks.find(t => t.instrument === instrumentId);
        if (track) {
          newTracksOrder.push(track);
        }
      }
      
      // 检查轨道顺序是否发生了变化
      const orderChanged = this.hasTracksOrderChanged(newTracksOrder);
      
      // 保持原有的可见性状态
      const visibleInstrumentsSnapshot = new Set(this.visibleInstruments);
      
      // 更新tracks数组
      this.tracks = newTracksOrder;
      
      // 恢复可见性状态
      this.visibleInstruments.clear();
      visibleInstrumentsSnapshot.forEach(id => {
        this.visibleInstruments.add(id);
      });
      
      // 如果轨道顺序发生了变化，记录历史
      if (orderChanged) {
        this.saveToHistory('tracks_reorder');
        console.log('轨道顺序已改变，记录历史');
      }
      
      // 重绘画布以反映新的轨道顺序
      this.draw();
      
      console.log('音色轨道顺序已更新');
    }
    
    // 绑定updateTracksOrder的this上下文
    updateTracksOrder = updateTracksOrder.bind(this);
  }

  // 检查轨道顺序是否发生变化
  hasTracksOrderChanged(newTracksOrder) {
    // 如果轨道数量不同，说明有变化
    if (this.tracks.length !== newTracksOrder.length) {
      return true;
    }
    
    // 比较每个轨道的顺序
    for (let i = 0; i < this.tracks.length; i++) {
      if (this.tracks[i].instrument !== newTracksOrder[i].instrument) {
        return true;
      }
    }
    
    return false;
  }

  // 检查按钮顺序是否需要更新
  checkButtonOrderNeedsUpdate(existingButtons) {
    if (!this.instrumentVisibilityPanel) return false;
    
    const currentButtonOrder = Array.from(existingButtons).map(button => button.dataset.instrumentId);
    const expectedOrder = this.tracks.map(track => track.instrument);
    
    // 比较按钮顺序和轨道顺序
    if (currentButtonOrder.length !== expectedOrder.length) {
      return true;
    }
    
    for (let i = 0; i < currentButtonOrder.length; i++) {
      if (currentButtonOrder[i] !== expectedOrder[i]) {
        return true;
      }
    }
    
    return false;
  }

  // 重新排列按钮以匹配轨道顺序
  reorderButtonsToMatchTracks() {
    if (!this.instrumentVisibilityPanel) return;
    
    const buttons = Array.from(this.instrumentVisibilityPanel.children);
    const buttonMap = new Map();
    
    // 创建按钮映射
    buttons.forEach(button => {
      buttonMap.set(button.dataset.instrumentId, button);
    });
    
    // 按照轨道顺序重新排列按钮
    this.tracks.forEach(track => {
      const button = buttonMap.get(track.instrument);
      if (button && button.parentNode) {
        this.instrumentVisibilityPanel.appendChild(button);
      }
    });
    
    console.log('按钮顺序已重新排列以匹配轨道顺序');
  }

  // 清理空的轨道
  cleanupEmptyTracks() {
    // 移除没有音符的轨道
    this.tracks = this.tracks.filter(track => track.notes.length > 0);
    
    // 更新音色显示控制面板（触发删除动画）
    this.updateInstrumentVisibilityPanel();
  }

  // 切换音色可见性
  toggleInstrumentVisibility(instrumentId) {
    // 不记录历史，因为这只是UI状态调整，不影响音符内容
    
    if (this.visibleInstruments.has(instrumentId)) {
      // 隐藏音色
      this.visibleInstruments.delete(instrumentId);
      
      // 释放该音色正在播放的音符
      this.stopInstrumentNotes(instrumentId);
    } else {
      // 显示音色
      this.visibleInstruments.add(instrumentId);
    }
    
    // 更新面板显示
    this.updateInstrumentVisibilityPanel();
    
    // 重绘画布
    this.draw();
  }

  // 只显示指定音色，隐藏其他所有音色
  showOnlyInstrument(instrumentId) {
    // 不记录历史，因为这只是UI状态调整，不影响音符内容
    
    // 停止所有正在播放的音符
    for (const track of this.tracks) {
      this.stopInstrumentNotes(track.instrument);
    }
    
    // 清空可见音色集合
    this.visibleInstruments.clear();
    
    // 只添加指定的音色
    this.visibleInstruments.add(instrumentId);
    
    // 更新面板显示
    this.updateInstrumentVisibilityPanel();
    
    // 重绘画布
    this.draw();
    
    console.log(`只显示音色: ${instrumentId}`);
  }

  // 停止指定音色的所有正在播放的音符
  stopInstrumentNotes(instrumentId) {
    // 遍历所有轨道，找到指定音色的正在播放的音符
    for (const track of this.tracks) {
      if (track.instrument === instrumentId) {
        for (const noteEntry of track.notes) {
          if (noteEntry.played) {
            // 停止该音符
            this.audioEngine.stopNote(noteEntry.midiNote, instrumentId);
            noteEntry.played = false;
          }
        }
      }
    }
  }

  // ==================== 撤回和恢复功能 ====================

  // 保存当前状态到历史记录
  saveToHistory(actionType = 'edit') {
    // 如果正在进行撤回/恢复操作，不保存历史
    if (this.isUndoRedoOperation) {
      return;
    }

    // 检查操作冷却时间
    // 注意：某些操作类型不应用冷却时间，以确保每次操作都能单独保存到历史记录
    const now = Date.now();
    const noCooldownActions = ['paste', 'delete', 'cut', 'recording', 'mouse_input', 'import', 'snap_position', 'snap_duration', 'bpm_change', 'beats_per_measure_change', 'changeVelocity', 'moveNotesToInstrument', 'tracks_reorder'];
    
    // 恢复冷却时间检查（排除关键操作类型）
    if (!noCooldownActions.includes(actionType) && now - this.lastActionTime < this.actionCooldown) {
      console.log(`操作冷却中: ${now - this.lastActionTime}ms < ${this.actionCooldown}ms`);
      return;
    }

    // 创建当前状态的深拷贝
    const currentState = this.createStateSnapshot();
    
    // 检查是否应该保存历史
    // 对于某些关键操作，总是保存历史，确保每个操作都有独立的历史节点
    const alwaysSaveActions = ['paste', 'delete', 'cut', 'recording', 'mouse_input', 'changeVelocity', 'moveNotesToInstrument', 'tracks_reorder'];
    const shouldSave = alwaysSaveActions.includes(actionType) || this.hasStateChanged(currentState);
    
    if (!shouldSave) {
      console.log(`状态没有变化，不保存历史: ${actionType}`);
      return;
    }
    
    // 移除当前索引之后的所有历史记录
    this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    
    // 添加新状态
    this.history.push({
      state: currentState,
      actionType: actionType,
      timestamp: now
    });
    
    // 限制历史记录数量
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.currentHistoryIndex++;
    }
    
    this.lastActionType = actionType;
    this.lastActionTime = now;
    this.pendingHistorySave = false;
    
    console.log(`历史状态已保存: ${actionType}, 当前索引: ${this.currentHistoryIndex}`);
  }

  // 创建状态快照
  createStateSnapshot() {
    return {
      tracks: JSON.parse(JSON.stringify(this.tracks)),
      selectedNotes: [], // 不保存选中状态，因为撤回后应该清空选中
      bpm: this.bpm,
      beatsPerMeasure: this.beatsPerMeasure
      // 不保存 visibleInstruments 和 playheadPosition，因为这些都是UI状态，不影响音符内容
    };
  }

  // 检查状态是否发生变化
  hasStateChanged(newState) {
    if (this.currentHistoryIndex < 0) {
      return true; // 第一个状态
    }
    
    const lastState = this.history[this.currentHistoryIndex].state;
    
    // 比较轨道数据
    const tracksChanged = JSON.stringify(newState.tracks) !== JSON.stringify(lastState.tracks);
    if (tracksChanged) {
      return true;
    }
    
    // 比较其他属性（不比较可见性和播放头位置，因为这些都是UI状态）
    const otherChanged = newState.bpm !== lastState.bpm ||
           newState.beatsPerMeasure !== lastState.beatsPerMeasure;
    
    return otherChanged;
  }

  // 撤回操作
  undo() {
    if (this.currentHistoryIndex <= 0) {
      console.log('没有可撤回的操作');
      return;
    }
    
    // 在撤回前先释放所有已选中的音符，触发历史行为保存
    if (this.selectedNotes.length > 0) {
      this.releaseSelectedNotes();
    }
    
    this.isUndoRedoOperation = true;
    
    // 移动到上一个状态
    this.currentHistoryIndex--;
    const targetState = this.history[this.currentHistoryIndex].state;
    
    // 恢复状态
    this.restoreState(targetState);
    
    this.isUndoRedoOperation = false;
    console.log(`撤回操作完成，当前索引: ${this.currentHistoryIndex}`);
  }

  // 恢复操作
  redo() {
    if (this.currentHistoryIndex >= this.history.length - 1) {
      console.log('没有可恢复的操作');
      return;
    }
    
    // 在恢复前先释放所有已选中的音符，触发历史行为保存
    if (this.selectedNotes.length > 0) {
      this.releaseSelectedNotes();
    }
    
    this.isUndoRedoOperation = true;
    
    // 移动到下一个状态
    this.currentHistoryIndex++;
    const targetState = this.history[this.currentHistoryIndex].state;
    
    // 恢复状态
    this.restoreState(targetState);
    
    this.isUndoRedoOperation = false;
    console.log(`恢复操作完成，当前索引: ${this.currentHistoryIndex}`);
  }

  // 恢复状态
  restoreState(state) {
    // 恢复轨道数据
    this.tracks = JSON.parse(JSON.stringify(state.tracks));
    
    // 不恢复可见音色，保持当前的UI状态
    // this.visibleInstruments 保持不变
    
    // 清空选中状态
    this.selectedNotes = [];
    
    // 不恢复播放头位置，保持当前的播放位置
    // this.playheadPosition 保持不变
    
    // 恢复BPM和拍数设置
    this.bpm = state.bpm;
    this.beatsPerMeasure = state.beatsPerMeasure;
    
    // 更新UI显示
    this.updateBpmDisplay();
    this.updateBeatsPerMeasureDisplay();
    
    // 更新音色显示控制面板（这会重新排列按钮顺序以匹配轨道顺序）
    this.updateInstrumentVisibilityPanel();
    
    // 重新调整canvas大小
    this.resizeCanvas();
    
    // 重绘
    this.draw();
    this.updateInfoDisplay();
  }

  // 记录编辑行为
  recordEditAction(actionType) {
    // 延迟保存，避免频繁操作
    setTimeout(() => {
      if (this.pendingHistorySave) {
        this.saveToHistory(actionType);
      }
    }, this.actionCooldown);
  }

  // 检查是否可以撤回
  canUndo() {
    return this.currentHistoryIndex > 0;
  }

  // 检查是否可以恢复
  canRedo() {
    return this.currentHistoryIndex < this.history.length - 1;
  }

  // 检查选中释放并保存历史状态
  checkForSelectionRelease() {
    // 如果正在进行撤回/恢复操作，不保存历史
    if (this.isUndoRedoOperation) {
      return;
    }
    
    // 如果自定义对话框打开，不处理音符释放
    if (this.isCustomDialogOpen) {
      return;
    }
    
    // 如果当前有选中的音符，且鼠标释放，检查是否需要保存历史
    if (this.selectedNotes.length > 0 && !this.isEditing && !this.isSelecting) {
      // 延迟检查，避免在拖拽过程中触发
      setTimeout(() => {
        if (this.selectedNotes.length > 0 && !this.isEditing && !this.isSelecting && !this.isUndoRedoOperation && !this.isCustomDialogOpen) {
          // 检查是否有待保存的历史状态
          if (this.pendingHistorySave) {
            this.saveToHistory(this.lastActionType || 'selection_release');
          }
        }
      }, 50);
    }
  }

  // 释放所有已选中的音符
  releaseSelectedNotes() {
    if (this.selectedNotes.length === 0) {
      return;
    }
    
    // 如果自定义对话框打开，不释放音符
    if (this.isCustomDialogOpen) {
      console.log('对话框打开中，跳过音符释放');
      return;
    }
    
    console.log(`释放 ${this.selectedNotes.length} 个已选中的音符`);
    
    // 在非撤回/恢复操作时，保存待保存的历史状态
    if (!this.isUndoRedoOperation && this.pendingHistorySave) {
      this.saveToHistory(this.lastActionType || 'selection_release');
    } else if (this.isUndoRedoOperation) {
      // 在撤回/恢复操作时，不保存待保存的历史状态，避免历史记录混乱
      this.pendingHistorySave = false;
    }
    
    // 清空选中状态
    this.selectedNotes = [];
    
    // 重置交互状态
    this.resetInteractionState();
    
    // 重绘
    this.draw();
    this.updateInfoDisplay();
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
  
  // 播放节拍器提示音
  playMetronomeBeat(currentTime) {
    // 计算当前时间对应的拍数
    const currentBeats = currentTime * this.bpm / 60;
    
    // 计算当前节拍数（基于每小节拍数）
    // 如果beatsPerMeasure为0，则每拍都是强拍
    const beatInMeasure = this.beatsPerMeasure > 0 ? 
      Math.floor(currentBeats) % this.beatsPerMeasure : 
      0;
    
    // 确定是否应该播放节拍提示音
    // 每当进入新的拍数时播放
    const currentBeat = Math.floor(currentBeats);
    
    if (currentBeat > this.currentBeat) {
      // 更新节拍计数
      this.currentBeat = currentBeat;
      
      // 确定播放哪种提示音
      let isStrongBeat = false;
      
      if (this.beatsPerMeasure === 0) {
        // 如果每小节拍数为0，总是播放弱拍音
        isStrongBeat = false;
      } else if (this.beatsPerMeasure === 1) {
        // 如果每小节拍数为1，每拍都是强拍
        isStrongBeat = true;
      } else {
        // 正常情况，每小节的第一拍是强拍
        isStrongBeat = (beatInMeasure === 0);
      }
      
      // 播放相应的提示音
      // 强拍使用较高的音（例如C5），弱拍使用较低的音（例如C4）
      const metronomeNote = isStrongBeat ? 72 : 60; // C5 vs C4
      const metronomeVelocity = isStrongBeat ? 100 : 60; // 强拍音量较大，弱拍音量较小
      
      // 与音符触发保持相同时间基准
      const frequency = Tone.Midi(metronomeNote).toFrequency();
      // 使用新的音量变量
      this.audioEngine.metronomeSynth.volume.value = this.metronomeVolume;
      this.audioEngine.metronomeSynth.triggerAttackRelease(
        frequency,
        '8n',
        Tone.context.currentTime + 0.001 // 使用Web Audio API绝对时间
      );
      
      // 在节拍器图标和翻转图标之间切换，并触发动画效果
      const metronomeIcon = document.getElementById('metronome-icon');
      if (metronomeIcon) {
        // 移除可能存在的旧动画类
        metronomeIcon.classList.remove('metronome-beat');
        
        // 强制重绘以确保动画重新开始
        metronomeIcon.offsetHeight;
        
        // 切换图标
        if (metronomeIcon.src.includes('metronome.svg')) {
          metronomeIcon.src = 'icons/metronome-flipped.svg';
        } else {
          metronomeIcon.src = 'icons/metronome.svg';
        }
        
        // 添加动画类
        metronomeIcon.classList.add('metronome-beat');
      }
      
      console.log(`节拍器: ${isStrongBeat ? '强拍' : '弱拍'} - 拍数: ${currentBeat}`);
    }
  }
  
  // 开始鼠标输入音符
  startMouseInputNote(pos) {
    this.isMousePressed = true;
    this.mouseInputStartTime = Date.now();
    this.mouseInputStartPos = { ...pos };
    this.mouseInputStartBeats = pos.x / this.pixelsPerBeat;
    
    // 计算音高 - 使用与显示相同的计算方式
    const noteHeight = this.canvas.height / 128; // 与updateMouseInfo和drawRecordedNotes保持一致
    const baseNote = 127 - Math.floor(pos.y / noteHeight);
    this.mouseInputNote = Math.max(0, Math.min(127, baseNote));
    
    // 播放音符 - 力度设置为100以匹配直接演奏音量
    const currentInstrument = this.audioEngine.currentInstrument;
    this.audioEngine.playNote(this.mouseInputNote, 100, false, currentInstrument);
    
    // 立即绘制临时音符（按下时就显示）
    this.draw();
  }
  
  // 结束鼠标输入音符
  endMouseInputNote() {
    if (!this.isMousePressed || this.mouseInputNote === null) return;
    
    this.isMousePressed = false;
    
    // 计算音符持续时间（以拍为单位）
    const now = Date.now();
    const durationMs = now - this.mouseInputStartTime;
    const durationBeats = durationMs / 1000 * this.bpm / 60;
    
    // 停止播放音符
    const currentInstrument = this.audioEngine.currentInstrument;
    this.audioEngine.stopNote(this.mouseInputNote, currentInstrument);
    
    // 创建音符 - 力度设置为100
    const note = {
      midiNote: this.mouseInputNote,
      startTime: this.mouseInputStartBeats,
      endTime: this.mouseInputStartBeats + durationBeats,
      velocity: 100 // 力度设置为100
    };
    
    // 添加到当前乐器的轨道
    try {
      const currentInstrument = this.audioEngine.currentInstrument;
      const track = this.getOrCreateTrack(currentInstrument);
      track.notes.push(note);
      console.log('音符已添加到轨道:', note);
      console.log('当前乐器:', currentInstrument);
      console.log('轨道音符数量:', track.notes.length);
      
      // 保存历史状态
      this.saveToHistory('mouse_input');
      
      // 更新显示
      this.draw();
      this.updateInfoDisplay();
    } catch (error) {
      console.error('添加音符到轨道时出错:', error);
    }
    
    // 重置鼠标输入状态
    this.mouseInputNote = null;
  }
  
  // 处理力度调节的历史记录
  handleVelocityAdjustment() {
    const now = Date.now();
    
    // 如果是第一次调节力度
    if (!this.isVelocityAdjusting) {
      this.isVelocityAdjusting = true;
      this.velocityAdjustStartTime = now;
    }
    
    // 清除之前的定时器
    if (this.velocityAdjustTimeout) {
      clearTimeout(this.velocityAdjustTimeout);
    }
    
    // 设置延迟保存定时器（500ms后保存）
    this.velocityAdjustTimeout = setTimeout(() => {
      this.saveToHistory('velocity_change');
      this.isVelocityAdjusting = false;
      this.velocityAdjustTimeout = null;
      console.log('力度调节完成，保存历史状态');
    }, 500);
  }
  
  // 检查鼠标是否移动离开音符位置并处理
  checkMouseMoveForInputMode(currentPos) {
    if (!this.isMouseInputEnabled || !this.isMousePressed || !this.mouseInputStartPos) return;
    
    const noteHeight = this.canvas.height / 128;
    const threshold = noteHeight / 2; // 设置阈值为音符高度的一半
    
    // 计算与起始位置的距离
    const deltaX = Math.abs(currentPos.x - this.mouseInputStartPos.x);
    const deltaY = Math.abs(currentPos.y - this.mouseInputStartPos.y);
    
    // 如果移动距离超过阈值，则转为选择框模式
    if (deltaX > threshold || deltaY > threshold) {
      // 停止播放当前音符
      const currentInstrument = this.audioEngine.currentInstrument;
      this.audioEngine.stopNote(this.mouseInputNote, currentInstrument);
      
      // 重置鼠标输入状态，但不添加音符
      this.isMousePressed = false;
      this.mouseInputNote = null;
      
      // 开始绘制选择框
      this.startSelection(this.mouseInputStartPos, false);
    }
  }
}