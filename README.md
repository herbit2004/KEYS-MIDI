# KEYS-MIDI 虚拟钢琴

一个功能完整的基于Web的虚拟钢琴应用，支持MIDI输入、音频合成、采样音色、打击乐和MIDI编辑功能。

## 🎹 主要功能

### 核心演奏功能
- **虚拟钢琴键盘**：支持鼠标点击和计算机键盘演奏
- **双键盘映射模式**：提供两种不同的键盘布局，适应不同演奏习惯
- **延音踏板**：支持空格键作为延音踏板，实现音符延长效果
- **和弦演奏**：支持多键同时按下演奏和弦

### 音色系统
- **合成音色**：内置多种合成器音色（钢琴、吉他、贝斯等）
- **采样音色**：支持真实乐器采样（钢琴、吉他、打击乐等）
- **懒加载机制**：采样音色按需加载，提升启动速度
- **音色平衡**：内置音量调节，确保不同音色听感平衡
- **音色显示控制**：可视化音色轨道管理，支持音色高亮和工具提示

### 打击乐系统
- **GM标准映射**：47个打击乐音色，覆盖完整打击乐套件
- **音高映射**：B1-A5音高范围，对应不同打击乐器
- **真实采样**：使用专业打击乐采样库

### MIDI编辑功能
- **录制播放**：实时录制演奏并回放
- **可视化编辑**：直观的音符编辑界面
- **音符操作**：移动、复制、粘贴、删除音符
- **参数调节**：力度、时长、位置精确控制
- **导入导出**：支持JSON格式工程文件导入导出（包含BPM和拍/小节信息）
- **自动吸附**：支持音符吸附到网格，可调节吸附精度和灵敏度
- **节拍器**：内置节拍器，支持音量调节
- **全屏编辑**：支持全屏模式进行专业编辑

### 音频效果
- **全局效果器**：延迟、混响等效果
- **音色效果器**：每个音色可独立配置效果链
- **实时调节**：旋钮控制，实时参数调整

### 转调控制
- **八度转调**：±3个八度范围
- **半音转调**：±12个半音范围
- **快捷键支持**：方向键快速转调

### 界面功能
- **状态栏显示**：实时显示播放头位置、鼠标位置、选中音符信息
- **音色工具提示**：鼠标悬浮显示音色名称
- **音符高亮**：悬浮音色时对应音符高亮显示
- **响应式设计**：适配不同屏幕尺寸

## 🏗️ 代码结构

### 核心模块
```
js/
├── AudioEngine.js          # 音频引擎核心
├── MainController.js       # 主控制器
├── InstrumentConfig.js     # 音色配置管理
├── LoadingManager.js       # 懒加载管理
├── KeyMapper.js           # 键盘映射
├── MidiEditor.js          # MIDI编辑器
├── VisualManager.js       # 视觉管理
└── Tone.js                # Tone.js封装
```

### 配置文件
```
├── instruments.json        # 音色配置文件
├── samples/               # 采样文件目录
│   ├── samplePiano/       # 钢琴采样
│   ├── sampleGuitar/      # 吉他采样
│   └── samplesPercussion/ # 打击乐采样
├── icons/                 # 界面图标
└── 打击乐映射.txt         # 打击乐音高映射参考
```

## 🔧 配置方法

### 音色配置

在 `instruments.json` 中配置音色：

```json
{
  "instruments": {
    "myInstrument": {
      "name": "我的音色",
      "color": "#426fec",
      "synth": {
        "type": "PolySynth",  // 或 "Sampler"
        "options": {
          // 合成器参数或采样器配置
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

### 合成音色配置

```json
{
  "synth": {
    "type": "PolySynth",
    "options": {
      "oscillator": {
        "type": "sine",  // 或 "square", "sawtooth", "triangle"
        "partials": [1, 0.5, 0.25]  // 自定义波形
      },
      "envelope": {
        "attack": 0.1,
        "decay": 0.2,
        "sustain": 0.5,
        "release": 0.8
      }
    }
  }
}
```

### 采样音色配置

```json
{
  "synth": {
    "type": "Sampler",
    "options": {
      "baseUrl": "samples/myInstrument/",
      "urls": {
        "C4": "C4.wav",
        "D4": "D4.wav",
        "E4": "E4.wav"
      },
      "release": 1.0,
      "attack": 0.01
    }
  }
}
```

### 支持的效果器类型

- `Filter`: 滤波器（低通、高通、带通、陷波）
- `Reverb`: 混响
- `Delay`: 延迟
- `Chorus`: 合唱
- `Tremolo`: 颤音
- `Distortion`: 失真
- `Compressor`: 压缩器
- `Vibrato`: 颤音
- `EQ3`: 三段均衡器

## 🚀 扩展开发

### 添加新音色

1. **准备采样文件**：将WAV文件放入 `samples/` 目录
2. **配置映射**：在 `instruments.json` 中添加配置
3. **重启应用**：刷新页面即可使用

### 自定义键盘映射

修改 `KeyMapper.js` 中的映射配置：

```javascript
const keyMappings = {
  default: {
    'q': 'C4',
    'w': 'C#4',
    'e': 'D4'
    // ...
  }
};
```

### 扩展效果器

在 `AudioEngine.js` 的 `createInstrumentFromConfig` 方法中添加新的效果器类型：

```javascript
case 'MyEffect':
  effect = new Tone.MyEffect(effectOptions);
  break;
```

### 自定义MIDI编辑器

扩展 `MidiEditor.js` 添加新的编辑功能：

```javascript
class MidiEditor {
  // 添加新的编辑方法
  addCustomFeature() {
    // 实现自定义功能
  }
}
```

### 扩展状态栏显示

修改 `updateInfoDisplay()` 方法添加新的状态信息：

```javascript
updateInfoDisplay() {
  // 添加自定义状态显示逻辑
  this.updateCustomStatus();
}
```

### 添加新的工具提示

在 `MidiEditor.js` 中添加新的工具提示功能：

```javascript
showCustomTooltip(element, content) {
  // 实现自定义工具提示
}
```

## 🎯 技术实现

### 音频处理流程

```
键盘输入 → KeyMapper → MainController → AudioEngine → Tone.js → 音频输出
```

### 懒加载机制

```
音色选择 → LoadingManager → 检查加载状态 → 异步加载采样 → 更新UI
```

### MIDI编辑流程

```
录制 → 音符数据 → MidiEditor → 可视化渲染 → 播放引擎
```

### 效果器链

```
音色输出 → 音色效果器 → 全局效果器 → 主音量 → 音频输出
```

### 状态栏更新机制

```
鼠标移动/音符选择 → updateInfoDisplay → 格式化显示 → 更新DOM
```

### 工具提示系统

```
鼠标悬浮 → 显示工具提示 → 高亮相关音符 → 鼠标离开 → 隐藏提示
```

## 📦 部署要求

- **现代浏览器**：支持Web Audio API
- **HTTP服务器**：本地文件访问需要服务器环境
- **音频文件**：WAV格式采样文件

## 🎵 使用场景

- **音乐创作**：实时演奏和MIDI编辑
- **音乐教育**：虚拟钢琴教学
- **音乐制作**：采样音色和效果器实验
- **现场表演**：实时演奏和效果控制
- **编曲制作**：专业MIDI编辑和音色管理

## 🔗 相关资源

- [Tone.js 文档](https://tonejs.github.io/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MIDI 标准](https://www.midi.org/)

---

*KEYS-MIDI - 让音乐创作更简单*