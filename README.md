# KEYS-MIDI 虚拟钢琴

这是一个基于Web的虚拟钢琴应用，支持MIDI输入和音频合成。

## 功能特性

- 虚拟钢琴键盘，支持鼠标和键盘演奏
- 多种音色选择
- 八度和转调控制
- MIDI录制和播放
- 可视化音频效果器
- 两种键盘映射模式切换

## 键盘映射

### 默认映射

- 第一八度 (C2-B2)
  - tab: C2 (MIDI 36)
  - 1: C#2/Db2
  - q: D2
  - 2: D#2/Eb2
  - w: E2
  - e: F2
  - 4: F#2/Gb2
  - r: G2
  - 5: G#2/Ab2
  - t: A2
  - 6: A#2/Bb2
  - y: B2

- 第二八度 (C3-B3)
  - u: C3（中央C）
  - 8: C#3/Db3
  - i: D3
  - 9: D#3/Eb3
  - o: E3
  - p: F3
  - -: F#3/Gb3
  - [: G3
  - =: G#3/Ab3
  - ]: A3
  - backspace: A#3/Bb3
  - \: B3
  
- 第三八度 (C4-B4)
  - \: C4（MIDI 60）
  - z: C#4/Db4
  - s: D4
  - x: D#4/Eb4
  - d: E4
  - c: F4
  - v: F#4/Gb4
  - g: G4
  - b: G#4/Ab4
  - h: A4（标准音440Hz）
  - n: A#4/Bb4
  - j: B4
  
- 第四八度 (C5-E5)
  - m: C5
  - ,: C#5/Db5
  - l: D5
  - .: D#5/Eb5
  - ;: E5
  - /: F5

### 替代映射

- 第一八度 (C2-B2)
  - z: C2 (MIDI 36)
  - s: C#2/Db2
  - x: D2
  - d: D#2/Eb2
  - c: E2
  - v: F2
  - g: F#2/Gb2
  - b: G2
  - h: G#2/Ab2
  - n: A2
  - j: A#2/Bb2
  - m: B2

- 第二八度 (C3-B3)
  - ,: C3（中央C）
  - l: C#3/Db3
  - .: D3
  - ;: D#3/Eb3
  - /: E3
  - [: F3
  - 1: F#3/Gb3
  - q: G3
  - 2: G#3/Ab3
  - w: A3
  - 3: A#3/Bb3
  - e: B3

- 第三八度 (C4-B4)
  - r: C4（MIDI 60）
  - 5: C#4/Db4
  - t: D4
  - 6: D#4/Eb4
  - y: E4
  - u: F4
  - 8: F#4/Gb4
  - i: G4
  - 9: G#4/Ab4
  - o: A4（标准音440Hz）
  - 0: A#4/Bb4
  - p: B4

- 第四八度 (C5-E5)
  - ]: C5
  - =: C#5/Db5
  - \: D5
  - backspace: D#5/Eb5
  - tab: E5

## 使用方法

1. 在浏览器中打开 `index.html`
2. 使用鼠标点击键盘或使用计算机键盘演奏
3. 通过界面上的控件调整音色、八度和转调
4. 使用MIDI编辑器录制和播放音乐
5. 通过键盘映射选择器在两种映射模式间切换

## 技术栈

- HTML5 Canvas
- Web Audio API
- Tone.js
- Vanilla JavaScript