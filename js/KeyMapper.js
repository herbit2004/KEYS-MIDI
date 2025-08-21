// 键盘映射模块
export class KeyMapper {
  constructor() {
    // 定义键盘到MIDI音符的映射
    this.keyMap = new Map([
      // 第一八度 (C2-B2)
      ['tab', 36],  // C2 (MIDI 36)
      ['1', 37],  // C#2/Db2
      ['q', 38],  // D2
      ['2', 39],  // D#2/Eb2
      ['w', 40],  // E2
      ['e', 41],  // F2
      ['4', 42],  // F#2/Gb2
      ['r', 43],  // G2
      ['5', 44],  // G#2/Ab2
      ['t', 45],  // A2
      ['6', 46],  // A#2/Bb2
      ['y', 47],  // B2

      // 第二八度 (C3-B3)
      ['u', 48],  // C3（中央C）
      ['8', 49],  // C#3/Db3
      ['i', 50],  // D3
      ['9', 51],  // D#3/Eb3
      ['o', 52],  // E3
      ['p', 53],  // F3
      ['-', 54],  // F#3/Gb3
      ['[', 55],  // G3
      ['=', 56],  // G#3/Ab3
      [']', 57],  // A3
      ['backspace', 58],  // A#3/Bb3
      ['\\', 59],  // B3
      
      // 第三八度 (C4-B4)
      ['\\', 60],  // C4（MIDI 60）
      ['z', 61],  // C#4/Db4
      ['s', 62],  // D4
      ['x', 63],  // D#4/Eb4
      ['d', 64],  // E4
      ['c', 65],  // F4
      ['v', 66],  // F#4/Gb4
      ['g', 67],  // G4
      ['b', 68],  // G#4/Ab4
      ['h', 69],  // A4（标准音440Hz）
      ['n', 70],  // A#4/Bb4
      ['j', 71],  // B4
      
      // 第四八度 (C5-E5)
      ['m', 72],  // C5
      [',', 73],  // C#5/Db5
      ['l', 74],  // D5
      ['.', 75],  // D#5/Eb5
      [';', 76],  // E5
      ['/', 77]   // F5
    ]);
    
    // 替代映射
    this.alternativeKeyMap = new Map([
      // 第一八度 (C2-B2)
      ['z', 36],  // C2 (MIDI 36)
      ['s', 37],  // C#2/Db2
      ['x', 38],  // D2
      ['d', 39],  // D#2/Eb2
      ['c', 40],  // E2
      ['v', 41],  // F2
      ['g', 42],  // F#2/Gb2
      ['b', 43],  // G2
      ['h', 44],  // G#2/Ab2
      ['n', 45],  // A2
      ['j', 46],  // A#2/Bb2
      ['m', 47],  // B2
      
      // 第二八度 (C3-B3)
      [',', 48],  // C3（中央C）
      ['l', 49],  // C#3/Db3
      ['.', 50],  // D3
      [';', 51],  // D#3/Eb3
      ['/', 52],  // E3
      ['tab', 53],  // F3
      ['1', 54],  // F#3/Gb3
      ['q', 55],  // G3
      ['2', 56],  // G#3/Ab3
      ['w', 57],  // A3
      ['3', 58],  // A#3/Bb3
      ['e', 59],  // B3
      
      // 第三八度 (C4-B4)
      ['r', 60],  // C4（MIDI 60）
      ['5', 61],  // C#4/Db4
      ['t', 62],  // D4
      ['6', 63],  // D#4/Eb4
      ['y', 64],  // E4
      ['u', 65],  // F4
      ['8', 66],  // F#4/Gb4
      ['i', 67],  // G4
      ['9', 68],  // G#4/Ab4
      ['o', 69],  // A4（标准音440Hz）
      ['0', 70],  // A#4/Bb4
      ['p', 71],  // B4
      
      // 第四八度 (C5-E5)
      ['[', 72],  // C5
      ['=', 73],  // C#5/Db5
      [']', 74],  // D5
      ['backspace', 75],  // D#5/Eb5
      ['\\', 76]   // E5
    ]);
    
    // 当前使用的映射
    this.currentKeyMap = this.keyMap;
    
    // 转调控制变量
    this.keyTurning = 0; // 半音转调值
    this.octaveShift = 0; // 八度偏移
  }

  // 获取MIDI音符编号
  getMidiNote(key) {
    const baseNote = this.currentKeyMap.get(key);
    if (baseNote !== undefined) {
      // 应用转调和八度偏移
      return baseNote + this.keyTurning + (this.octaveShift * 12);
    }
    return null;
  }

  // 切换键盘映射
  switchKeyMap(mappingType) {
    if (mappingType === 'alternative') {
      this.currentKeyMap = this.alternativeKeyMap;
    } else {
      this.currentKeyMap = this.keyMap;
    }
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