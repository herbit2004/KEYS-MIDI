# KEYS-MIDI 虚拟钢琴

一个功能完整的基于Web的虚拟钢琴应用，支持MIDI输入、音频合成、采样音色、打击乐、MIDI编辑和撤回/恢复功能。

## 🎹 项目概述

KEYS-MIDI是一个基于Web Audio API和Tone.js构建的虚拟钢琴应用，采用模块化架构设计，支持实时演奏、MIDI编辑、多轨道录制、音色管理和MIDI导出等功能。

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

## 🔗 相关资源

- [Tone.js 文档](https://tonejs.github.io/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MIDI 标准](https://www.midi.org/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
