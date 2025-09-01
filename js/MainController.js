// 主控制器模块
import { KeyMapper } from './KeyMapper.js';
import { AudioEngine } from './AudioEngine.js';
import { VisualManager } from './VisualManager.js';
import { InstrumentConfig } from './InstrumentConfig.js';
import { MidiEditor } from './MidiEditor.js';

export class MainController {
  constructor() {
    // 初始化各模块
    this.keyMapper = new KeyMapper();
    this.audioEngine = new AudioEngine();
    this.visualManager = new VisualManager((octaveShift, keyTurning) => {
      // 更新状态显示
      document.getElementById('octave-shift').textContent = octaveShift;
      document.getElementById('key-turning').textContent = keyTurning;
    }, this.keyMapper);
    
    // 初始化音色配置加载器
    this.instrumentConfig = new InstrumentConfig();
    
    // 初始化MIDI编辑器
    this.midiEditor = new MidiEditor(this.audioEngine, this.keyMapper, document.getElementById('snap-toggle'));
    
    // 延音踏板状态
    this.sustainPedalPressed = false;
    // 存储延音期间需要释放的音符
    this.sustainedNotes = new Map();
    
    // 绑定键盘事件
    this.bindKeyboardEvents();
    
    // 绑定按钮事件
    this.bindButtonEvents();
    
    // 绑定音色和效果器控制事件
    this.bindToneControlEvents();
    
    // 绑定全局效果器控制事件
    this.bindGlobalEffectEvents();
    

    // 绑定帮助窗口事件
    this.bindHelpEvents();
    
    // 绑定映射选择事件
    this.bindMappingEvents();
    
    // 初始化状态显示
    this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
    
    // 设置VisualManager的主控制器引用
    this.visualManager.setMainController(this);
    
    // 监听音色加载完成事件
    document.addEventListener('instrumentLoaded', () => {
      this.updateToneSelectOptions();
    });
    
    // 加载音色配置并初始化音色
    this.loadInstruments();
  }

  // 加载音色配置并初始化音色
  async loadInstruments() {
    try {
      // 加载音色配置
      await this.instrumentConfig.loadConfig();
      
      // 立即设置MIDI编辑器的音色配置（在音色初始化之前）
      this.midiEditor.setInstrumentConfig(this.instrumentConfig);
      
      // 立即更新前端音色选择列表（在音色初始化之前）
      this.updateToneSelectOptions();
      
      // 获取音色配置
      const config = this.instrumentConfig;
      
      // 从配置初始化音色
      await this.audioEngine.initSynthsWithConfig(config);
      
      // 再次更新前端音色选择列表（音色初始化后）
      this.updateToneSelectOptions();
      
      console.log('音色配置加载完成');
    } catch (error) {
      console.error('加载音色配置时出错:', error);
    }
  }

  // 绑定键盘事件
  bindKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      
      // 禁用Tab键的默认行为，防止焦点切换，但仍允许琴键映射
      if (key === 'tab') {
        event.preventDefault();
        // 不阻止事件传播，允许琴键映射处理
      }
      
      // 处理延音踏板（空格键）
      if (key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        // 防止重复触发，但仍然阻止默认行为
        if (event.repeat) return;
        this.sustainPedalPressed = true;
        return;
      }
      
      // 防止其他键的重复触发
      if (event.repeat) return;
      
      // 如果MIDI编辑器中有选中的音符，阻止方向键的转调功能
      if (this.midiEditor && this.midiEditor.selectedNotes && this.midiEditor.selectedNotes.length > 0 &&
          ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      
      // 处理转调控制
      if (this.handleTranspose(key)) return;
      
      // 处理音符播放
      this.handleNoteOn(key);
    });
    
    document.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      
      // 处理延音踏板释放
      if (key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        this.sustainPedalPressed = false;
        // 释放所有延音期间保持的音符
        this.releaseSustainedNotes();
        return;
      }
      
      this.handleNoteOff(key);
    });
  }
  
  // 绑定帮助窗口事件
  bindHelpEvents() {
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeButton = document.querySelector('.close-button');
    
    if (helpButton && helpModal && closeButton) {
      // 显示帮助窗口
      helpButton.addEventListener('click', () => {
        helpModal.style.display = 'flex';
        
        // 动态加载使用说明内容
        const instructions = document.querySelector('.instructions');
        if (instructions) {
          const content = instructions.innerHTML;
          const modalContent = helpModal.querySelector('.help-modal-content');
          if (modalContent) {
            // 插入内容到关闭按钮之后
            modalContent.innerHTML = '<span class="close-button">&times;</span>' + content;
            
            // 重新绑定关闭按钮事件
            const newCloseButton = modalContent.querySelector('.close-button');
            if (newCloseButton) {
              newCloseButton.addEventListener('click', () => {
                helpModal.style.display = 'none';
              });
            }
          }
        }
      });
      
      // 关闭帮助窗口
      closeButton.addEventListener('click', () => {
        helpModal.style.display = 'none';
      });
      
      // 点击模态框外部关闭窗口
      helpModal.addEventListener('click', (event) => {
        if (event.target === helpModal) {
          helpModal.style.display = 'none';
        }
      });
    }
  }
  
  // 绑定按钮事件
  bindButtonEvents() {
    // 八度调整按钮
    document.getElementById('octave-up').addEventListener('click', () => {
      this.keyMapper.shiftOctave(1);
      this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
    });
    
    document.getElementById('octave-down').addEventListener('click', () => {
      this.keyMapper.shiftOctave(-1);
      this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
    });
    
    // 转调调整按钮
    document.getElementById('transpose-up').addEventListener('click', () => {
      this.keyMapper.shiftKey(1);
      this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
    });
    
    document.getElementById('transpose-down').addEventListener('click', () => {
      this.keyMapper.shiftKey(-1);
      this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
    });
    
    // 重置按钮
    document.getElementById('reset').addEventListener('click', () => {
      this.keyMapper.resetTranspose();
      this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
    });

    // 释放按钮：释放所有正在演奏的音符
    const releaseBtn = document.getElementById('release');
    if (releaseBtn) {
      releaseBtn.addEventListener('click', () => {
        // 释放音频层所有活动音符
        if (this.audioEngine && typeof this.audioEngine.stopAllNotes === 'function') {
          this.audioEngine.stopAllNotes();
        }

        // 同步释放视觉层所有按键
        if (this.visualManager && typeof this.visualManager.releaseAllKeys === 'function') {
          this.visualManager.releaseAllKeys();
        } else {
          // 若没有批量API，则尝试基于已知按键集合释放
          if (this.visualManager && this.visualManager.currentPressedKey) {
            this.visualManager.releaseKey(this.visualManager.currentPressedKey);
          }
        }

        // 清空延音队列
        if (this.sustainedNotes) {
          this.sustainedNotes.clear();
        }
      });
    }
  }
  
  // 绑定映射选择事件
  bindMappingEvents() {
    // 获取所有映射选择的radio按钮
    const mappingRadios = document.querySelectorAll('input[name="key-mapping"]');
    mappingRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        if (event.target.checked) {
          const selectedMapping = event.target.value;
          this.keyMapper.switchKeyMap(selectedMapping);
          // 重新绘制键盘以更新显示的字符
          this.visualManager.drawKeyboard();
        }
      });
    });
  }

  // 绑定音色控制事件
  bindToneControlEvents() {
    // 音色切换
    const toneSelect = document.getElementById('tone-select');
    if (toneSelect) {
      toneSelect.addEventListener('change', async (event) => {
        const instrument = event.target.value;
        await this.audioEngine.changeInstrument(instrument);
        this.updateToneSelectOptions();
        toneSelect.blur();
      });
      
      // 简化的菜单展开/收起逻辑
      document.addEventListener('click', (event) => {
        if (!toneSelect.contains(event.target)) {
          toneSelect.blur();
        }
      });
    }
  }

  // 更新前端音色选择列表
  updateToneSelectOptions() {
    const toneSelect = document.getElementById('tone-select');
    if (!toneSelect) {
      console.warn('找不到音色选择器元素');
      return;
    }

    // 清空现有选项
    toneSelect.innerHTML = '';

    // 添加新的选项
    const instrumentNames = this.instrumentConfig.getAllInstrumentNames();
    console.log('获取到的音色名称:', instrumentNames);
    
    for (const instrumentId in instrumentNames) {
      const option = document.createElement('option');
      option.value = instrumentId;
      
      // 检查音色是否已加载（确保loadingManager已初始化）
      if (this.audioEngine.loadingManager && this.audioEngine.loadingManager.isInstrumentLoaded(instrumentId)) {
        // 已加载的音色：正常显示
        option.textContent = instrumentNames[instrumentId];
      } else {
        // 未加载的音色：添加云朵图标前缀
        option.textContent = `☁ ${instrumentNames[instrumentId]}`;
      }
      
      toneSelect.appendChild(option);
    }

    // 设置当前选中的音色
    if (this.audioEngine.currentInstrument) {
      toneSelect.value = this.audioEngine.currentInstrument;
    }
    
    console.log('音色列表更新完成，共添加了', Object.keys(instrumentNames).length, '个音色');
  }

  // 绑定全局效果器控制事件
  bindGlobalEffectEvents() {
    // 当前选中的旋钮
    let selectedKnob = null;
    
    // 为所有旋钮添加点击事件以选中
    const knobItems = document.querySelectorAll('.knob-item');
    knobItems.forEach(knobItem => {
      // 获取旋钮参数
      const param = knobItem.dataset.param;
      let value = parseFloat(knobItem.dataset.value);
      const min = parseFloat(knobItem.dataset.min);
      const max = parseFloat(knobItem.dataset.max);
      const step = parseFloat(knobItem.dataset.step);
      const knob = knobItem.querySelector('.knob');
      const valueDisplay = knobItem.querySelector('.knob-value');

      // 计算初始旋转角度 (范围 -135° 到 135°)
      const range = max - min;
      const normalizedValue = (value - min) / range;
      const initialRotation = -135 + normalizedValue * 270;
      knob.style.transform = `rotate(${initialRotation}deg)`;

      // 初始化时同步旋钮值到音频引擎
      if (param === 'master-volume') {
        // 将0-100的旋钮值转换为-60到0的dB值
        const dBValue = (value / 100) * 60 - 60;
        this.audioEngine.setMasterVolume(dBValue);
      } else if (param === 'delay-time') {
        this.audioEngine.setGlobalDelay({ delayTime: value });
      } else if (param === 'delay-feedback') {
        this.audioEngine.setGlobalDelay({ feedback: value });
      } else if (param === 'reverb-decay') {
        this.audioEngine.setGlobalReverb({ decay: value });
      } else if (param === 'reverb-wet') {
        this.audioEngine.setGlobalReverb({ wet: value });
      }

      // 添加点击事件以选中旋钮
      knob.addEventListener('click', (e) => {
        // 取消之前选中旋钮的高亮
        if (selectedKnob && selectedKnob !== knobItem) {
          selectedKnob.classList.remove('selected');
        }
        
        // 切换当前旋钮的选中状态
        if (selectedKnob === knobItem) {
          // 如果点击的是已选中的旋钮，则取消选中
          knobItem.classList.remove('selected');
          selectedKnob = null;
        } else {
          // 选中当前旋钮
          knobItem.classList.add('selected');
          selectedKnob = knobItem;
        }
        
        e.stopPropagation();
      });

      // 添加鼠标滚轮事件监听
      knob.addEventListener('mousewheel', (e) => {
        // 只有在旋钮被选中时才响应滚轮事件
        if (selectedKnob !== knobItem) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();

        // 根据滚轮方向调整值
        if (e.deltaY < 0) {
          value = Math.min(value + step, max);
        } else {
          value = Math.max(value - step, min);
        }

        // 格式化为适当的小数位数
        value = Math.round(value * (1 / step)) / (1 / step);

        // 更新数据属性
        knobItem.dataset.value = value;

        // 更新显示值
        let displayValue = value;
        if (param === 'delay-time' || param === 'reverb-decay' || param === 'reverb-predelay') {
          displayValue = `${value}s`;
        } else if (param === 'master-volume') {
          displayValue = `${value}%`;
        }
        valueDisplay.textContent = displayValue;

        // 计算并应用旋转
        const normalizedValue = (value - min) / range;
        const rotation = -135 + normalizedValue * 270;
        knob.style.transform = `rotate(${rotation}deg)`;

        // 根据参数类型调用相应的音频引擎方法
        switch (param) {
          case 'delay-time':
            this.audioEngine.setGlobalDelay({ delayTime: value });
            break;
          case 'delay-feedback':
            this.audioEngine.setGlobalDelay({ feedback: value });
            break;
          case 'delay-wet':
            this.audioEngine.setGlobalDelayWet(value);
            break;
          case 'reverb-decay':
            this.audioEngine.setGlobalReverb({ decay: value });
            break;
          case 'reverb-predelay':
            this.audioEngine.setGlobalReverbPredelay(value);
            break;
          case 'reverb-wet':
            this.audioEngine.setGlobalReverb({ wet: value });
            break;
          case 'master-volume':
            // 将0-100的旋钮值转换为-60到0的dB值
            const dBValue = (value / 100) * 60 - 60;
            this.audioEngine.setMasterVolume(dBValue);
            break;
        }
      });
    });
    
    // 点击页面其他地方取消旋钮选中状态
    document.addEventListener('click', (e) => {
      if (selectedKnob && !e.target.closest('.knob-item')) {
        selectedKnob.classList.remove('selected');
        selectedKnob = null;
      }
    });
  }

  // 处理转调控制
  handleTranspose(key) {
    let updated = false;
    
    switch (key) {
      case 'arrowup':
        this.keyMapper.shiftOctave(1);
        updated = true;
        break;
      case 'arrowdown':
        this.keyMapper.shiftOctave(-1);
        updated = true;
        break;
      case 'arrowleft':
        this.keyMapper.shiftKey(-1);
        updated = true;
        break;
      case 'arrowright':
        this.keyMapper.shiftKey(1);
        updated = true;
        break;
      default:
        return false;
    }
    
    if (updated) {
      // 更新界面状态显示
      this.visualManager.updateStatus(this.keyMapper.octaveShift, this.keyMapper.keyTurning);
      console.log(`转调控制: 八度偏移=${this.keyMapper.octaveShift}, 半音转调=${this.keyMapper.keyTurning}`);
    }
    
    return true;
  }

  // 处理音符按下
  async handleNoteOn(key) {
    const note = this.keyMapper.getMidiNote(key);
    if (note !== null) {
      // 如果MIDI编辑器正在录制，记录音符事件
      if (this.midiEditor && this.midiEditor.isRecording) {
        this.midiEditor.recordNoteOn(note, Tone.now());
      }
      
      // 优先触发音频（关键路径）
      // 如果延音踏板被按下，允许重新触发音符
      // 使用当前选中的音色播放音符
      await this.audioEngine.playNote(note, 100, this.sustainPedalPressed, this.audioEngine.currentInstrument);
      
      // 异步更新UI，避免阻塞音频触发
      requestAnimationFrame(() => {
        this.visualManager.pressKey(key);
        // 生产环境可移除控制台日志
        // console.log(`播放音符: ${key} (MIDI: ${note})`);
      });
    }
  }

  // 处理音符松开
  handleNoteOff(key) {
    const note = this.keyMapper.getMidiNote(key);
    if (note !== null) {
      // 如果MIDI编辑器正在录制，记录音符事件
      if (this.midiEditor && this.midiEditor.isRecording) {
        this.midiEditor.recordNoteOff(note, Tone.now());
      }
      
      // 如果延音踏板被按下，将音符添加到延音列表而不是立即释放
      if (this.sustainPedalPressed) {
        // 存储音符信息以便稍后释放
        this.sustainedNotes.set(note, key);
        // 更新界面但不释放音频
        this.visualManager.releaseKey(key);
        console.log(`延音保持音符: ${key} (MIDI: ${note})`);
      } else {
        // 停止音频 - 停止当前音色的音符
        this.audioEngine.stopNote(note, this.audioEngine.currentInstrument);
        // 更新界面
        this.visualManager.releaseKey(key);
        
        console.log(`停止音符: ${key} (MIDI: ${note})`);
      }
    }
  }
  
  // 释放延音期间保持的音符
  releaseSustainedNotes() {
    // 释放所有延音期间保持的音符
    this.sustainedNotes.forEach((key, note) => {
      // 停止音频 - 停止当前音色的音符
      this.audioEngine.stopNote(note, this.audioEngine.currentInstrument);
      console.log(`释放延音保持的音符: ${key} (MIDI: ${note})`);
    });
    
    // 清空延音列表
    this.sustainedNotes.clear();
  }
}