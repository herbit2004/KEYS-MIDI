// MIDI导出器模块
export class MidiExporter {
  constructor() {
    // MIDI标准参数
    this.PPQN = 480; // 每四分音符的脉冲数
    this.CHANNEL_DRUMS = 9; // 打击乐专用通道（0-based，对应MIDI通道10）
  }

  // 导出MIDI文件
  export(tracks, bpm, beatsPerMeasure, instrumentConfig) {
    if (tracks.length === 0) {
      alert('没有录制内容可导出');
      return;
    }

    try {
      // 创建MIDI文件数据
      const midiData = this.createMidiFile(tracks, bpm, beatsPerMeasure, instrumentConfig);
      
      // 下载文件
      this.downloadMidiFile(midiData);
      
      console.log('MIDI文件导出成功');
    } catch (error) {
      console.error('MIDI导出失败:', error);
      alert('MIDI导出失败: ' + error.message);
    }
  }

  // 创建MIDI文件数据
  createMidiFile(tracks, bpm, beatsPerMeasure, instrumentConfig) {
    // MIDI文件头部
    const header = this.createMidiHeader();
    
    // 创建轨道数据
    const midiTracks = [];
    
    // 添加Tempo轨道（第一个轨道）
    const tempoTrack = this.createTempoTrack(bpm, beatsPerMeasure);
    midiTracks.push(tempoTrack);
    
    // 分离打击乐和普通乐器轨道
    const drumTracks = [];
    const instrumentTracks = [];
    
    tracks.forEach(track => {
      if (this.isDrumInstrument(track.instrument)) {
        drumTracks.push(track);
      } else {
        instrumentTracks.push(track);
      }
    });
    
    // 处理普通乐器轨道
    instrumentTracks.forEach((track, index) => {
      const midiTrack = this.createInstrumentTrack(track, index, instrumentConfig, bpm);
      midiTracks.push(midiTrack);
    });
    
    // 处理打击乐轨道（合并到通道10）
    if (drumTracks.length > 0) {
      const drumTrack = this.createDrumTrack(drumTracks, instrumentConfig, bpm);
      midiTracks.push(drumTrack);
    }
    
    // 组合MIDI文件
    return this.combineMidiData(header, midiTracks);
  }

  // 创建MIDI文件头部
  createMidiHeader() {
    const header = new Uint8Array(14);
    
    // MIDI文件标识符 "MThd"
    header[0] = 0x4D; // M
    header[1] = 0x54; // T
    header[2] = 0x68; // h
    header[3] = 0x64; // d
    
    // 头部长度（6字节）
    header[4] = 0x00;
    header[5] = 0x00;
    header[6] = 0x00;
    header[7] = 0x06;
    
    // 格式类型（1 = 多轨道）
    header[8] = 0x00;
    header[9] = 0x01;
    
    // 轨道数量（稍后更新）
    header[10] = 0x00;
    header[11] = 0x00;
    
    // 时间分辨率（PPQN）
    header[12] = (this.PPQN >> 8) & 0xFF;
    header[13] = this.PPQN & 0xFF;
    
    return header;
  }

  // 创建Tempo轨道
  createTempoTrack(bpm, beatsPerMeasure) {
    const events = [];
    
    // 设置Tempo事件
    const tempo = Math.round(60000000 / bpm); // 微秒/四分音符
    events.push({
      ...this.createTempoEvent(0, tempo),
      time: 0
    });
    
    // 设置时间签名事件
    events.push({
      ...this.createTimeSignatureEvent(0, beatsPerMeasure, 4),
      time: 0
    });
    
    // 设置轨道结束事件
    events.push({
      ...this.createEndOfTrackEvent(0),
      time: 0
    });
    
    // 按时间排序所有事件
    events.sort((a, b) => a.time - b.time);
    
    // 计算delta time
    const eventsWithDelta = this.calculateDeltaTimes(events);
    
    return this.createTrackChunk(eventsWithDelta);
  }

  // 创建乐器轨道
  createInstrumentTrack(track, trackIndex, instrumentConfig, bpm) {
    const events = [];
    
    // 获取MIDI乐器编号
    const midiProgram = this.getMidiProgram(track.instrument, instrumentConfig);
    
    // 设置乐器（Program Change）
    events.push({
      ...this.createProgramChangeEvent(0, trackIndex, midiProgram),
      time: 0
    });
    
    // 设置轨道名称
    const instrumentName = this.getInstrumentName(track.instrument, instrumentConfig);
    events.push({
      ...this.createTrackNameEvent(0, instrumentName),
      time: 0
    });
    
    // 添加音符事件
    const noteEvents = this.createNoteEvents(track.notes, trackIndex, bpm);
    events.push(...noteEvents);
    
    // 设置轨道结束事件
    events.push({
      ...this.createEndOfTrackEvent(0),
      time: 0
    });
    
    // 按时间排序所有事件
    events.sort((a, b) => a.time - b.time);
    
    // 计算delta time
    const eventsWithDelta = this.calculateDeltaTimes(events);
    
    return this.createTrackChunk(eventsWithDelta);
  }

  // 创建打击乐轨道
  createDrumTrack(drumTracks, instrumentConfig, bpm) {
    const events = [];
    
    // 设置轨道名称
    events.push({
      ...this.createTrackNameEvent(0, "Drums"),
      time: 0
    });
    
    // 合并所有打击乐音符
    const allDrumNotes = [];
    drumTracks.forEach(track => {
      allDrumNotes.push(...track.notes);
    });
    
    // 添加音符事件（使用通道9）
    const noteEvents = this.createNoteEvents(allDrumNotes, this.CHANNEL_DRUMS, bpm);
    events.push(...noteEvents);
    
    // 设置轨道结束事件
    events.push({
      ...this.createEndOfTrackEvent(0),
      time: 0
    });
    
    // 按时间排序所有事件
    events.sort((a, b) => a.time - b.time);
    
    // 计算delta time
    const eventsWithDelta = this.calculateDeltaTimes(events);
    
    return this.createTrackChunk(eventsWithDelta);
  }

  // 创建音符事件
  createNoteEvents(notes, channel, bpm) {
    const events = [];
    
    notes.forEach(note => {
      // 转换时间单位（拍数 -> ticks）
      const startTicks = this.convertBeatsToTicks(note.startTime, bpm);
      const endTicks = this.convertBeatsToTicks(note.endTime, bpm);
      
      // Note On事件
      events.push({
        ...this.createNoteOnEvent(startTicks, channel, note.midiNote, note.velocity),
        time: startTicks
      });
      
      // Note Off事件
      events.push({
        ...this.createNoteOffEvent(endTicks, channel, note.midiNote),
        time: endTicks
      });
    });
    
    return events;
  }

  // 转换拍数到MIDI ticks
  convertBeatsToTicks(beats, bpm) {
    return Math.round(beats * this.PPQN);
  }

  // 计算delta time
  calculateDeltaTimes(events) {
    let lastTime = 0;
    return events.map(event => {
      const delta = event.time - lastTime;
      lastTime = event.time;
      return { ...event, delta };
    });
  }

  // 创建Tempo事件
  createTempoEvent(delta, tempo) {
    return {
      type: 'meta',
      delta: delta,
      metaType: 0x51, // Tempo
      data: [
        (tempo >> 16) & 0xFF,
        (tempo >> 8) & 0xFF,
        tempo & 0xFF
      ]
    };
  }

  // 创建时间签名事件
  createTimeSignatureEvent(delta, numerator, denominator) {
    return {
      type: 'meta',
      delta: delta,
      metaType: 0x58, // Time Signature
      data: [numerator, Math.log2(denominator), 24, 8] // 分子, 分母, MIDI时钟, 32分音符
    };
  }

  // 创建Program Change事件
  createProgramChangeEvent(delta, channel, program) {
    return {
      type: 'channel',
      delta: delta,
      status: 0xC0 | channel, // Program Change
      data: [program]
    };
  }

  // 创建Note On事件
  createNoteOnEvent(time, channel, note, velocity) {
    return {
      type: 'channel',
      status: 0x90 | channel, // Note On
      data: [note, velocity]
    };
  }

  // 创建Note Off事件
  createNoteOffEvent(time, channel, note) {
    return {
      type: 'channel',
      status: 0x80 | channel, // Note Off
      data: [note, 0]
    };
  }

  // 创建轨道名称事件
  createTrackNameEvent(delta, name) {
    const nameBytes = this.stringToBytes(name);
    return {
      type: 'meta',
      delta: delta,
      metaType: 0x03, // Track Name
      data: nameBytes
    };
  }

  // 创建轨道结束事件
  createEndOfTrackEvent(delta) {
    return {
      type: 'meta',
      delta: delta,
      metaType: 0x2F, // End of Track
      data: []
    };
  }

  // 创建轨道数据块
  createTrackChunk(events) {
    // 将事件转换为MIDI数据
    const trackData = this.eventsToMidiData(events);
    
    // 创建轨道头部
    const trackHeader = new Uint8Array(8);
    trackHeader[0] = 0x4D; // M
    trackHeader[1] = 0x54; // T
    trackHeader[2] = 0x72; // r
    trackHeader[3] = 0x6B; // k
    
    // 轨道数据长度
    const dataLength = trackData.length;
    trackHeader[4] = (dataLength >> 24) & 0xFF;
    trackHeader[5] = (dataLength >> 16) & 0xFF;
    trackHeader[6] = (dataLength >> 8) & 0xFF;
    trackHeader[7] = dataLength & 0xFF;
    
    // 组合轨道头部和数据
    const trackChunk = new Uint8Array(8 + dataLength);
    trackChunk.set(trackHeader, 0);
    trackChunk.set(trackData, 8);
    
    return trackChunk;
  }

  // 将事件转换为MIDI数据
  eventsToMidiData(events) {
    const data = [];
    
    events.forEach(event => {
      // 写入delta time
      this.writeVariableLength(data, event.delta);
      
      if (event.type === 'meta') {
        // Meta事件
        data.push(0xFF); // Meta事件标识
        data.push(event.metaType);
        this.writeVariableLength(data, event.data.length);
        data.push(...event.data);
      } else if (event.type === 'channel') {
        // 通道事件
        data.push(event.status);
        data.push(...event.data);
      }
    });
    
    return new Uint8Array(data);
  }

  // 写入可变长度值
  writeVariableLength(data, value) {
    if (value === 0) {
      data.push(0);
      return;
    }
    
    const bytes = [];
    while (value > 0) {
      bytes.unshift(value & 0x7F);
      value >>= 7;
    }
    
    // 设置除最后一个字节外的所有字节的最高位
    for (let i = 0; i < bytes.length - 1; i++) {
      bytes[i] |= 0x80;
    }
    
    data.push(...bytes);
  }

  // 字符串转字节数组
  stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  // 组合MIDI文件数据
  combineMidiData(header, tracks) {
    // 更新轨道数量
    const trackCount = tracks.length;
    header[10] = (trackCount >> 8) & 0xFF;
    header[11] = trackCount & 0xFF;
    
    // 计算总长度
    let totalLength = header.length;
    tracks.forEach(track => {
      totalLength += track.length;
    });
    
    // 组合所有数据
    const midiData = new Uint8Array(totalLength);
    let offset = 0;
    
    midiData.set(header, offset);
    offset += header.length;
    
    tracks.forEach(track => {
      midiData.set(track, offset);
      offset += track.length;
    });
    
    return midiData;
  }

  // 下载MIDI文件
  downloadMidiFile(midiData) {
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keys-midi-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mid`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 判断是否为打击乐音色
  isDrumInstrument(instrumentId) {
    // 根据音色ID判断是否为打击乐
    const drumInstruments = ['sampledPercussion', 'percussion'];
    return drumInstruments.some(drum => instrumentId.includes(drum));
  }

  // 获取MIDI乐器编号
  getMidiProgram(instrumentId, instrumentConfig) {
    const config = instrumentConfig.getInstrumentConfig(instrumentId);
    if (config && config.midiProgram !== undefined) {
      return config.midiProgram;
    }
    
    // 默认映射
    const defaultMapping = {
      'sampledPiano': 0,      // Acoustic Grand Piano
      'sampledOldPiano': 0,   // Acoustic Grand Piano
      'sampledGuitar': 24,    // Acoustic Guitar (steel)
      'sampledGuitar2': 24,   // Acoustic Guitar (steel)
      'sampledMutedGuitar': 25, // Acoustic Guitar (nylon)
      'sampledBass': 32,      // Acoustic Bass
      'sampledPercussion': 0, // 打击乐使用通道10，这里不影响
      'piano': 0,             // Acoustic Grand Piano
      'guitar': 24,           // Acoustic Guitar (steel)
      'electricGuitar': 27,   // Electric Guitar (clean)
      'bass': 32,             // Acoustic Bass
      'strings': 48,          // String Ensemble 1
      'synth': 80,            // Square Lead
      'pad': 89,              // Pad 2 (warm)
      'lead': 80,             // Square Lead
      'fx': 103               // FX 7 (echoes)
    };
    
    return defaultMapping[instrumentId] || 0;
  }

  // 获取乐器名称
  getInstrumentName(instrumentId, instrumentConfig) {
    const config = instrumentConfig.getInstrumentConfig(instrumentId);
    return config ? config.name : instrumentId;
  }
}
