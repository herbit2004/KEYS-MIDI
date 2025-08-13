// 键盘映射模块
export class KeyMapper {
  constructor() {
    // 定义键盘到MIDI音符的映射
    this.keyMap = new Map([
      // 第一八度 (C2-B2)
      ['q', 36],  // C2 (MIDI 36)
      ['2', 37],  // C#2/Db2
      ['w', 38],  // D2
      ['3', 39],  // D#2/Eb2
      ['e', 40],  // E2
      ['r', 41],  // F2
      ['5', 42],  // F#2/Gb2
      ['t', 43],  // G2
      ['6', 44],  // G#2/Ab2
      ['y', 45],  // A2
      ['7', 46],  // A#2/Bb2
      ['u', 47],  // B2

      // 第二八度 (C3-B3)
      ['i', 48],  // C3（中央C）
      ['9', 49],  // C#3/Db3
      ['o', 50],  // D3
      ['0', 51],  // D#3/Eb3
      ['p', 52],  // E3
      ['[', 53],  // F3
      ['=', 54],  // F#3/Gb3
      [']', 55],  // G3
      
      // 第三八度 (G#3-C5)
      ['a', 56],  // G#3/Ab3
      ['z', 57],  // A3
      ['s', 58],  // A#3/Bb3
      ['x', 59],  // B3
      ['c', 60],  // C4（MIDI 60）
      ['f', 61],  // C#4/Db4
      ['v', 62],  // D4
      ['g', 63],  // D#4/Eb4
      ['b', 64],  // E4
      ['n', 65],  // F4
      ['j', 66],  // F#4/Gb4
      ['m', 67],  // G4
      ['k', 68],  // G#4/Ab4
      [',', 69],  // A4（标准音440Hz）
      ['l', 70],  // A#4/Bb4
      ['.', 71],  // B4
      ['/', 72]   // C5
    ]);
    
    // 转调控制变量
    this.keyTurning = 0; // 半音转调值
    this.octaveShift = 0; // 八度偏移
  }

  // 获取MIDI音符编号
  getMidiNote(key) {
    const baseNote = this.keyMap.get(key);
    if (baseNote === undefined) return null;
    return baseNote + this.octaveShift * 12 + this.keyTurning;
  }

  // 八度调整
  shiftOctave(direction) {
    // 限制八度调整范围在合理区间
    this.octaveShift += direction;
    if (this.octaveShift > 3) this.octaveShift = 3;
    if (this.octaveShift < -3) this.octaveShift = -3;
    return this.octaveShift;
  }

  // 半音调整
  shiftKey(direction) {
    this.keyTurning += direction;
    // 限制半音调整范围
    if (this.keyTurning > 11) this.keyTurning = 11;
    if (this.keyTurning < -11) this.keyTurning = -11;
    return this.keyTurning;
  }

  // 重置转调
  resetTranspose() {
    this.keyTurning = 0;
    this.octaveShift = 0;
  }
}