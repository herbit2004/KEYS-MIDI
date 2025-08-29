# KEYS-MIDI 虚拟钢琴

一个功能完整的基于Web的虚拟钢琴应用，支持MIDI输入、音频合成、采样音色、打击乐、MIDI编辑、撤回/恢复功能、右键菜单编辑、力度控制、音色切换等高级功能。

## 🎹 项目概述

KEYS-MIDI是一个基于Web Audio API和Tone.js构建的虚拟钢琴应用，采用模块化架构设计，支持实时演奏、MIDI编辑、多轨道录制、音色管理、MIDI导出、高级编辑功能等。项目经过持续优化，现已支持完整的音乐制作工作流程。

## 🏗️ 项目架构

### 核心模块结构

```
js/
├── MainController.js       # 主控制器 - 协调各模块交互
├── AudioEngine.js          # 音频引擎 - 音色合成和效果处理
├── MidiEditor.js           # MIDI编辑器 - 录制、编辑、撤回/恢复
├── KeyMapper.js            # 键盘映射 - 双键盘布局支持
├── VisualManager.js        # 视觉管理 - UI状态和动画
├── InstrumentConfig.js     # 音色配置 - 音色加载和管理
├── LoadingManager.js       # 懒加载管理 - 采样文件按需加载
└── Tone.js                 # Tone.js封装 - 音频处理封装
```

### 配置文件结构

```
├── instruments.json        # 音色配置文件
├── samples/               # 采样文件目录
│   ├── samplePiano/       # 钢琴采样 (641个文件)
│   ├── sampleGuitar/      # 吉他采样
│   ├── sampleBass/        # 贝斯采样
│   ├── sampleHarp/        # 竖琴采样
│   ├── sampleRhodes/      # 电钢琴采样
│   ├── sampleTrumpet/     # 小号采样
│   ├── sampleString/      # 弦乐采样
│   ├── sampleXylophone/   # 木琴采样
│   ├── sampleYamahaDX7/   # DX7合成器采样
│   └── samplesPercussion/ # 打击乐采样 (186个文件)
├── icons/                 # 界面图标
├── 打击乐映射.txt         # 打击乐音高映射参考
└── 导出midi.txt           # MIDI导出功能说明
```

## 🎵 功能模块详解

### 1. 在线钢琴模块 (MainController.js)

**实现思路：**
- 基于Web Audio API和Tone.js构建实时音频处理管道
- 支持鼠标点击和计算机键盘双重输入方式
- 实现延音踏板和和弦演奏功能

**核心功能：**
- 实时音频合成和播放
- 双键盘映射模式（默认/替代布局）
- 延音踏板支持（空格键）
- 和弦演奏和多键同时按下
- 八度转调（±3个八度）
- 半音转调（±12个半音）

**技术实现：**
```javascript
// 键盘事件处理
bindKeyboardEvents() {
  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const note = this.keyMapper.getNoteForKey(key);
    if (note) {
      this.audioEngine.playNote(note.midiNote, note.velocity);
    }
  });
}
```

### 2. 键盘映射模块 (KeyMapper.js)

**实现思路：**
- 提供两种键盘布局映射方案
- 支持动态切换映射模式
- 实现转调功能

**支持功能：**
- 默认键盘映射（QWERTY布局）
- 替代键盘映射（钢琴布局）
- 实时转调（八度/半音）
- 快捷键支持（方向键转调）

**扩展方法：**
```javascript
// 添加新的键盘映射
const customMapping = {
  'a': 'C4',
  's': 'D4',
  'd': 'E4'
  // ...
};
this.keyMapper.addMapping('custom', customMapping);
```

### 3. MIDI编辑器模块 (MidiEditor.js)

**实现思路：**
- 基于Canvas的实时可视化编辑界面
- 实现完整的撤回/恢复系统
- 支持多轨道编辑和音色管理

**核心功能：**
- 实时录制和播放
- 可视化音符编辑
- 撤回/恢复系统（支持10次历史记录）
- 多轨道管理
- 自动吸附功能
- 节拍器支持
- 全屏编辑模式

**撤回/恢复系统：**
```javascript
// 历史状态管理
this.history = []; // 历史状态数组
this.currentHistoryIndex = -1; // 当前历史状态索引
this.maxHistorySize = 10; // 最大历史记录数量

// 状态快照
createStateSnapshot() {
  return {
    tracks: JSON.parse(JSON.stringify(this.tracks)),
    visibleInstruments: [...this.visibleInstruments],
    playheadPosition: this.playheadPosition,
    bpm: this.bpm,
    beatsPerMeasure: this.beatsPerMeasure
  };
}
```

**支持的操作类型：**
- `edit`: 基本编辑操作
- `delete`: 删除音符
- `paste`: 粘贴音符
- `cut`: 剪切音符
- `move`: 移动音符
- `recording`: 录制操作
- `mouse_input`: 鼠标输入
- `velocity_change`: 力度调节
- `moveNotesToInstrument`: 音色切换
- `snap_position`: 位置吸附
- `snap_duration`: 时长吸附
- `bpm_change`: BPM修改
- `beats_per_measure_change`: 拍数修改
- `import`: 导入操作
- `visibility_change`: 可见性切换

### 4. 多轨道实现 (MidiEditor.js + AudioEngine.js)

**实现思路：**
- 每个音色对应一个独立的轨道
- 支持轨道的显示/隐藏控制
- 实现轨道的可视化管理

**技术实现：**
```javascript
// 轨道数据结构
class Track {
  constructor(instrument) {
    this.instrument = instrument;
    this.notes = [];
    this.visible = true;
  }
}

// 轨道管理
getOrCreateTrack(instrument) {
  let track = this.tracks.find(t => t.instrument === instrument);
  if (!track) {
    track = new Track(instrument);
    this.tracks.push(track);
  }
  return track;
}
```

### 5. 音色配置系统 (InstrumentConfig.js)

**实现思路：**
- 基于JSON配置文件的音色管理系统
- 支持合成音色和采样音色
- 实现与MIDI音色符号的标准映射

**配置结构：**
```json
{
  "instruments": {
    "piano": {
      "name": "钢琴",
      "color": "#426fec",
      "synth": {
        "type": "Sampler",
        "options": {
          "baseUrl": "samples/samplePiano/",
          "urls": {
            "C4": "C4.wav",
            "D4": "D4.wav"
          }
        }
      },
      "effects": [
        {
          "type": "Reverb",
          "options": {
            "roomSize": 0.5,
            "wet": 0.3
          }
        }
      ],
      "volume": 10
    }
  }
}
```

**支持的合成器类型：**
- `PolySynth`: 复音合成器
- `FMSynth`: FM合成器
- `Sampler`: 采样器

**支持的效果器：**
- `Filter`: 滤波器
- `Reverb`: 混响
- `Delay`: 延迟
- `Chorus`: 合唱
- `Tremolo`: 颤音
- `Distortion`: 失真
- `Compressor`: 压缩器
- `Vibrato`: 颤音
- `EQ3`: 三段均衡器

### 6. MIDI导出功能 (MidiExporter.js)

**实现思路：**
- 基于MIDI文件格式标准
- 支持多轨道导出
- 包含完整的MIDI元数据

**导出功能：**
- 多轨道MIDI文件生成
- 音色映射和通道分配
- 节拍和速度信息
- 音符事件和控制器事件

**技术实现：**
```javascript
class MidiExporter {
  constructor() {
    this.midiFile = new MidiFile();
  }
  
  exportToMidi(tracks, bpm, beatsPerMeasure) {
    // 创建MIDI文件头
    this.createMidiHeader(bpm, beatsPerMeasure);
    
    // 添加轨道数据
    tracks.forEach((track, index) => {
      this.addTrack(track, index);
    });
    
    return this.midiFile.toArrayBuffer();
  }
}
```

### 7. 鼠标静态输入 (MidiEditor.js)

**实现思路：**
- 实现鼠标点击创建音符功能
- 支持音符时长和力度控制
- 集成到撤回/恢复系统

**功能特性：**
- 鼠标点击创建音符
- 拖拽调整音符时长
- 实时音频反馈
- 自动轨道分配

### 8. 右键菜单编辑系统 (MidiEditor.js)

**实现思路：**
- 基于Canvas右键事件实现上下文菜单
- 动态菜单项状态管理
- 支持子菜单和快捷键提示

**核心功能：**
- 编辑操作：撤销、重做、剪切、复制、粘贴、删除
- 音符属性：力度设置、音色切换
- 动态状态：根据当前状态启用/禁用菜单项
- 快捷键提示：显示对应操作的键盘快捷键

**技术实现：**
```javascript
// 右键菜单配置
const contextMenuItems = [
  { id: 'undo', label: '撤销', shortcut: 'Ctrl+Z', action: () => this.undo() },
  { id: 'redo', label: '重做', shortcut: 'Ctrl+Y', action: () => this.redo() },
  { id: 'cut', label: '剪切', shortcut: 'Ctrl+X', action: () => this.cutNotes() },
  { id: 'copy', label: '复制', shortcut: 'Ctrl+C', action: () => this.copyNotes() },
  { id: 'paste', label: '粘贴', shortcut: 'Ctrl+V', action: () => this.pasteNotes() },
  { id: 'delete', label: '删除', shortcut: 'Delete', action: () => this.deleteSelectedNotes() },
  { id: 'velocity', label: '设置力度', action: () => this.showVelocityInput() },
  { id: 'instrument', label: '改变音色', submenu: true }
];
```

### 9. 自定义对话框系统 (MidiEditor.js)

**实现思路：**
- 完全自定义的模态对话框实现
- 页面交互隔离机制
- 支持输入验证和错误处理

**功能特性：**
- 力度输入对话框
- 错误提示对话框
- 页面交互完全隔离
- 输入验证和格式化

**交互隔离机制：**
```javascript
// 禁用页面交互
disablePageInteraction() {
  this.canvas.style.pointerEvents = 'none';
  this.keyboardEventsDisabled = true;
  this.globalClickDisabled = true;
  this.contextMenuDisabled = true;
}

// 恢复页面交互
enablePageInteraction() {
  this.canvas.style.pointerEvents = 'auto';
  this.keyboardEventsDisabled = false;
  this.globalClickDisabled = false;
  this.contextMenuDisabled = false;
}
```

### 10. 音符选择状态管理 (MidiEditor.js)

**实现思路：**
- 复杂的选择状态保持机制
- 支持跨轨道音符操作
- 操作后自动重新选中

**核心功能：**
- 音色切换后保持选中状态
- 力度修改后保持选中状态
- 多选音符拖拽优化
- 光标样式智能切换

**状态保持机制：**
```javascript
// 保存原始选中音符信息
const originalSelectedNotes = this.selectedNotes.map(noteRef => ({
  midiNote: noteRef.note.midiNote,
  startTime: noteRef.note.startTime,
  endTime: noteRef.note.endTime,
  velocity: noteRef.note.velocity
}));

// 操作完成后重新选中
setTimeout(() => {
  this.selectedNotes = [];
  for (const originalNote of originalSelectedNotes) {
    // 在所有轨道中查找匹配的音符并重新选中
  }
}, 100);
```

## 🔧 扩展开发指南

### 添加新音色

1. **准备采样文件**
```bash
# 将WAV文件放入samples目录
samples/myInstrument/
├── C4.wav
├── D4.wav
└── E4.wav
```

2. **配置音色**
```json
{
  "instruments": {
    "myInstrument": {
      "name": "我的音色",
      "color": "#ff6b6b",
      "synth": {
        "type": "Sampler",
        "options": {
          "baseUrl": "samples/myInstrument/",
          "urls": {
            "C4": "C4.wav",
            "D4": "D4.wav",
            "E4": "E4.wav"
          }
        }
      }
    }
  }
}
```

### 自定义键盘映射

```javascript
// 在KeyMapper.js中添加新映射
const customMappings = {
  custom: {
    'q': 'C4',
    'w': 'C#4',
    'e': 'D4',
    'r': 'D#4',
    't': 'E4'
  }
};
```

### 扩展效果器

```javascript
// 在AudioEngine.js中添加新效果器
case 'MyEffect':
  effect = new Tone.MyEffect(effectOptions);
  break;
```

### 添加新的编辑功能

```javascript
// 在MidiEditor.js中添加新方法
class MidiEditor {
  addCustomFeature() {
    // 实现自定义功能
    this.saveToHistory('custom_feature');
  }
}
```

### 扩展右键菜单

```javascript
// 在MidiEditor.js中添加新的菜单项
const newMenuItem = {
  id: 'custom_action',
  label: '自定义操作',
  shortcut: 'Ctrl+Shift+A',
  action: () => this.performCustomAction()
};

// 添加到contextMenuItems数组
this.contextMenuItems.push(newMenuItem);
```

### 添加自定义对话框

```javascript
// 在MidiEditor.js中添加新的对话框
showCustomInputDialog(title, message, onConfirm) {
  this.showCustomDialog(title, message, '输入提示', onConfirm);
}
```

### 自定义MIDI导出格式

```javascript
// 扩展MidiExporter.js
class CustomMidiExporter extends MidiExporter {
  exportToCustomFormat(data) {
    // 实现自定义导出格式
  }
}
```

## 🚀 部署要求

### 环境要求
- **现代浏览器**: Chrome 70+, Firefox 65+, Safari 12+
- **Web Audio API**: 支持
- **HTTP服务器**: 本地文件访问需要服务器环境
- **音频文件**: WAV格式采样文件

### 安装步骤
```bash
# 克隆项目
git clone https://github.com/your-repo/KEYS-MIDI.git

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 生产部署
```bash
# 构建项目
npm run build

# 部署到Web服务器
# 确保所有采样文件正确部署
```

## 🎯 技术栈

- **前端框架**: 原生JavaScript (ES6+)
- **音频处理**: Tone.js + Web Audio API
- **图形渲染**: HTML5 Canvas
- **文件处理**: File API + Blob API
- **MIDI处理**: 自定义MIDI文件生成器
- **模块化**: ES6 Modules

## 🆕 最新功能更新

### 右键菜单编辑系统
- **完整的上下文菜单**：支持撤销、重做、剪切、复制、粘贴、删除等编辑操作
- **动态状态管理**：根据当前应用状态智能启用/禁用菜单项
- **快捷键提示**：每个菜单项显示对应的键盘快捷键
- **子菜单支持**：力度设置和音色切换支持二级菜单
- **智能关闭**：键盘操作或点击空白区域时自动关闭菜单

### 自定义对话框系统
- **完全隔离的交互**：对话框期间完全禁用页面交互，防止意外操作
- **输入验证**：力度输入支持0-100范围验证和错误提示
- **状态保持**：操作完成后自动保持音符选中状态
- **错误处理**：支持错误提示和重新输入机制

### 智能状态管理
- **音色切换优化**：切换音色后自动保持音符选中状态
- **力度修改优化**：修改力度后自动保持音符选中状态
- **多选拖拽优化**：多选拖拽以当前按住的音符为基准
- **智能光标显示**：多选状态下显示移动光标而非拉伸光标

### 历史记录扩展
- **音色切换记录**：音色切换操作支持撤回/恢复
- **力度修改记录**：力度修改操作支持撤回/恢复
- **操作冷却优化**：关键操作不受冷却时间限制
- **状态快照优化**：更精确的状态变化检测

## 📊 性能优化

### 懒加载机制
- 采样文件按需加载
- 音色配置动态加载
- 内存使用优化

### 音频优化
- 音频缓存机制
- 并发播放限制
- 内存泄漏防护

### 渲染优化
- Canvas渲染优化
- 事件节流
- 状态更新批处理

### 交互优化
- 页面交互隔离机制
- 事件处理优化
- 状态管理优化

## 🔗 相关资源

- [Tone.js 文档](https://tonejs.github.io/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MIDI 标准](https://www.midi.org/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 📝 版本更新日志

### v2.0.0 (最新版本)
- ✨ 新增右键菜单编辑系统
- ✨ 新增自定义对话框系统
- ✨ 新增智能状态管理
- ✨ 新增音色切换和力度修改历史记录
- ✨ 新增多选拖拽优化
- ✨ 新增智能光标显示
- ✨ 新增页面交互隔离机制
- 🐛 修复音色切换后选中状态丢失问题
- 🐛 修复力度修改后选中状态丢失问题
- 🐛 修复多选拖拽基准点问题
- 🐛 修复MIDI导出格式兼容性问题
- 🐛 修复历史记录冷却时间问题
- 🔧 优化事件处理机制
- 🔧 优化状态管理逻辑
- 🔧 优化用户交互体验

### v1.0.0
- 🎹 基础虚拟钢琴功能
- 🎼 MIDI编辑器
- 🎵 多轨道支持
- 🎛️ 音色管理系统
- 📁 文件导入导出
- ↩️ 撤回/恢复功能
- 🎯 鼠标静态输入
- 🎚️ 音频效果器
