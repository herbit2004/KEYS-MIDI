# 采样音色使用指南

## 概述

重构后的音频引擎支持通用的采样音色加载系统，可以轻松添加新的采样音色而无需修改代码。系统采用直接的音符到文件URL映射方式，支持任意命名规则和音符组合。

## 添加新的采样音色

### 1. 准备采样文件

将采样文件放在 `samples/` 目录下的子文件夹中，例如：
```
samples/
├── samplePiano/
│   ├── A0v16.wav
│   ├── A1v16.wav
│   ├── C4v16.wav
│   └── ...
├── myCustomInstrument/
│   ├── note_C3.wav
│   ├── note_D3.wav
│   ├── note_E3.wav
│   └── ...
└── anotherSampler/
    ├── 001_A4.wav
    ├── 002_B4.wav
    ├── 003_C5.wav
    └── ...
```

### 2. 更新配置文件

在 `instruments.json` 中添加新的采样音色配置：

```json
{
  "instruments": {
    "myNewSampler": {
      "name": "我的新采样音色",
      "synth": {
        "type": "Sampler",
        "options": {
          "baseUrl": "samples/myNewSampler/",
          "urls": {
            "C3": "note_C3.wav",
            "D3": "note_D3.wav",
            "E3": "note_E3.wav",
            "F3": "note_F3.wav",
            "G3": "note_G3.wav",
            "A3": "note_A3.wav",
            "B3": "note_B3.wav",
            "C4": "note_C4.wav"
          },
          "release": 1.5,
          "attack": 0.01,
          "decay": 0.2,
          "sustain": 0.7
        }
      },
      "effects": [
        {
          "type": "Reverb",
          "options": {
            "roomSize": 0.8,
            "dampening": 3000,
            "wet": 0.2
          }
        }
      ],
      "volume": 12
    }
  }
}
```

### 3. 配置参数说明

#### 基本参数
- `baseUrl`: 采样文件的基础路径
- `urls`: 音符到文件名的映射对象
  - 键：音符名称（如 "C4", "A#3", "F5"）
  - 值：对应的文件名（相对于baseUrl的路径）

#### 采样器参数
- `release`: 释放时间（秒）
- `attack`: 攻击时间（秒）
- `decay`: 衰减时间（秒）
- `sustain`: 持续音量（0-1）

#### 效果器
可以添加任意数量的效果器，支持的类型：
- `Filter`: 滤波器
- `Reverb`: 混响
- `Delay`: 延迟
- `Chorus`: 合唱
- `Tremolo`: 颤音
- `Distortion`: 失真
- `Compressor`: 压缩器
- `Vibrato`: 颤音
- `EQ3`: 三段均衡器

#### 音量
- `volume`: 音色音量（dB），用于平衡不同音色的听感

## 配置示例

### 示例1：钢琴采样（当前配置）
```json
{
  "sampledPiano": {
    "name": "采样钢琴",
    "synth": {
      "type": "Sampler",
      "options": {
        "baseUrl": "samples/samplePiano/",
        "urls": {
          "A0": "A0v16.wav",
          "A1": "A1v16.wav",
          "C4": "C4v16.wav",
          "F#5": "F#5v16.wav"
        },
        "release": 1.2,
        "attack": 0.01,
        "decay": 0.1,
        "sustain": 0.8
      }
    },
    "effects": [],
    "volume": 10
  }
}
```

### 示例2：自定义命名规则
```json
{
  "customInstrument": {
    "name": "自定义乐器",
    "synth": {
      "type": "Sampler",
      "options": {
        "baseUrl": "samples/customInstrument/",
        "urls": {
          "C3": "note_C3.wav",
          "D3": "note_D3.wav",
          "E3": "note_E3.wav",
          "F3": "note_F3.wav"
        },
        "release": 1.0,
        "attack": 0.05,
        "decay": 0.3,
        "sustain": 0.6
      }
    },
    "effects": [
      {
        "type": "Filter",
        "options": {
          "type": "lowpass",
          "frequency": 2000,
          "Q": 1.0
        }
      }
    ],
    "volume": 8
  }
}
```

### 示例3：数字编号命名
```json
{
  "numberedSampler": {
    "name": "编号采样器",
    "synth": {
      "type": "Sampler",
      "options": {
        "baseUrl": "samples/numberedSampler/",
        "urls": {
          "A4": "001_A4.wav",
          "B4": "002_B4.wav",
          "C5": "003_C5.wav",
          "D5": "004_D5.wav"
        },
        "release": 2.0,
        "attack": 0.02,
        "decay": 0.5,
        "sustain": 0.5
      }
    },
    "effects": [],
    "volume": 15
  }
}
```

## 音色顺序

音色在列表中的显示顺序取决于 `instruments.json` 中的顺序。第一个音色将作为默认音色。

## 注意事项

1. **音符名称格式**：使用标准的音符名称格式，如 "C4", "A#3", "F5" 等
2. **文件路径**：`urls` 中的文件名是相对于 `baseUrl` 的路径
3. **文件格式**：采样文件必须是浏览器支持的音频格式（推荐 WAV）
4. **音量平衡**：通过 `volume` 参数调整不同音色的听感平衡
5. **效果器**：可以为采样音色添加任意数量的效果器

## 优势

1. **灵活性**：支持任意文件命名规则
2. **精确控制**：可以精确指定每个音符对应的文件
3. **简单配置**：只需在JSON中列出音符和文件名的对应关系
4. **无需代码修改**：添加新音色只需更新配置文件
5. **统一接口**：采样音色和合成音色使用相同的接口

## 故障排除

### 采样器加载失败
- 检查 `baseUrl` 路径是否正确
- 确认所有在 `urls` 中列出的文件都存在
- 检查文件格式是否被浏览器支持

### 音量过小或过大
- 调整 `volume` 参数
- 检查采样文件本身的音量
- 调整效果器参数

### 音符播放异常
- 确认 `urls` 中包含了所有需要的音符
- 检查音符名称格式是否正确（如 "C4", "A#3"）
- 验证采样文件是否损坏
