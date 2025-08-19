// 音频引擎模块
export class AudioEngine {
  constructor() {
    // 初始化合成器和音色专属效果器
    this.initSynths();
    
    // 初始化全局共享效果器
    this.initGlobalEffects();
    
    // 存储正在播放的音符
    this.activeNotes = new Map();
    
    // 音色选择（默认为Piano）
    this.currentInstrument = 'piano';
    
    // 存储手动设置的滤波器频率
    this.manualFilterFrequency = 1000;
    
    // 初始化采样钢琴（当前未启用）
    // this.initSampledPiano();
    
    // 创建节拍器专用的Polysynth合成器（不包含混响等效果）
    this.metronomeSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "square",
        partialCount: 3  // 限制泛音数量避免炸麦
      },
      envelope: {
        attack: 0.0001,  // 更快的attack时间
        decay: 0.15,     // 稍微延长衰减时间
        sustain: 0.0,
        release: 0.02    // 缩短释放时间使节拍更清晰
      }
    }).toDestination();
    
    // 设置节拍器音量
    this.metronomeSynth.volume.value = -25; // 设置为-25dB，可根据需要进一步调整
    
    // 建立默认连接（仅在currentSynth存在时）
    if (this.currentSynth) {
      this.connectEffects();
    }
  }



  // 初始化采样钢琴
  async initSampledPiano() {
    // 加载低/中/高音区采样（需准备音频文件）
    this.sampledPiano = new Tone.Sampler({
      urls: {
        "C4": "C4.mp3",
        "D4": "D4.mp3",
        // ... 覆盖常用音域
      },
      baseUrl: "samples/piano/", // 采样文件路径
      release: 1.2, // 采样释放时间
    }).connect(this.effectChain[0]); // 接入效果链
  }

  // 初始化合成器和音色专属效果器
  initSynths() {
    // 从配置文件初始化音色
    // 实际的音色初始化在initSynthsWithConfig方法中完成
    this.synths = {};
    
    // 默认音色将在initSynthsWithConfig方法中设置
    this.currentSynth = null;
  }

  // 从配置创建音色
  createInstrumentFromConfig(config) {
    // 创建合成器
    let synth;
    const synthOptions = config.synth.options || {};
    
    switch (config.synth.type) {
      case 'PolySynth':
        // 检查是否为FM合成器
        if (synthOptions.harmonicity !== undefined || synthOptions.modulationIndex !== undefined) {
          synth = new Tone.PolySynth(Tone.FMSynth, synthOptions);
        } else {
          synth = new Tone.PolySynth(Tone.Synth, synthOptions);
        }
        break;
      default:
        console.warn(`不支持的合成器类型: ${config.synth.type}`);
        synth = new Tone.PolySynth(Tone.Synth, synthOptions);
    }
    
    // 创建效果器
    const effects = [];
    if (config.effects && Array.isArray(config.effects)) {
      for (const effectConfig of config.effects) {
        let effect;
        const effectOptions = effectConfig.options || {};
        
        switch (effectConfig.type) {
          case 'Filter':
            effect = new Tone.Filter(effectOptions);
            break;
          case 'Tremolo':
            effect = new Tone.Tremolo(effectOptions);
            break;
          case 'Reverb':
            effect = new Tone.Reverb(effectOptions);
            break;
          case 'Distortion':
            effect = new Tone.Distortion(effectOptions.distortion);
            break;
          case 'Chorus':
            effect = new Tone.Chorus(effectOptions);
            break;
          case 'Compressor':
            effect = new Tone.Compressor(effectOptions);
            break;
          case 'Delay':
            effect = new Tone.Delay(effectOptions);
            break;
          default:
            console.warn(`不支持的效果器类型: ${effectConfig.type}`);
            continue;
        }
        
        effects.push(effect);
      }
    }
    
    return {
      synth,
      effects,
      volume: config.volume || 0
    };
  }

  // 从配置文件初始化所有音色
  async initSynthsWithConfig(config) {
    this.synths = {};
    
    for (const instrumentId in config.instruments) {
      const instrumentConfig = config.instruments[instrumentId];
      try {
        this.synths[instrumentId] = this.createInstrumentFromConfig(instrumentConfig);
      } catch (error) {
        console.error(`创建音色 ${instrumentId} 时出错:`, error);
      }
    }
    
    // 设置默认音色
    if (Object.keys(this.synths).length > 0) {
      const firstInstrumentId = Object.keys(this.synths)[0];
      this.currentInstrument = firstInstrumentId;
      this.currentSynth = this.synths[firstInstrumentId];
      // 连接默认音色的效果链
      this.connectEffects();
    }
  }

  // 初始化全局共享效果器
  initGlobalEffects() {
    this.globalEffects = {
      delay: new Tone.FeedbackDelay({
        delayTime: 0.2,
        feedback: 0.1,
        wet: 0.2
      }),
      reverb: new Tone.Reverb({
        decay: 2,
        preDelay: 0.1,
        wet: 0.3
      }),
      // 添加全局音量控制节点
      masterVolume: new Tone.Volume(0) // 初始音量为0dB
    };
    
    // 连接全局效果器链
    this.globalEffects.delay.connect(this.globalEffects.reverb);
    this.globalEffects.reverb.connect(this.globalEffects.masterVolume);
    this.globalEffects.masterVolume.toDestination();
  }

  // 建立完整连接链路
  connectEffects() {
    // 断开当前连接
    if (this.currentSynth && this.currentSynth.synth) {
      this.currentSynth.synth.disconnect();
      
      // 断开当前音色效果链中各节点的连接
      this.currentSynth.effects.forEach(effect => {
        effect.disconnect();
      });
    }
    
    // 连接当前音色的专属效果链
    let lastNode = this.currentSynth.synth;
    this.currentSynth.effects.forEach(effect => {
      lastNode.connect(effect);
      lastNode = effect;
    });
    
    // 应用当前音色的独立音量控制
    const volumeNode = new Tone.Volume(this.currentSynth.volume);
    lastNode.connect(volumeNode);
    lastNode = volumeNode;
    
    // 连接全局效果链
    lastNode.connect(this.globalEffects.delay);
  }

  // 播放音符
  playNote(note, velocity = 100, allowRetrigger = false) {
    const vel = velocity / 127; // 归一化到0-1
    const frequency = Tone.Midi(note).toFrequency();
    
    // 优先使用采样钢琴（当前未启用）
    // if (this.currentInstrument === 'piano' && this.sampledPiano) {
    //   this.sampledPiano.triggerAttackRelease(
    //     Tone.Midi(note).toNote(),
    //     "8n", // 音符时长（可动态调整）
    //     Tone.context.currentTime,
    //     vel // 力度
    //   );
    //   return;
    // }
    
    // 如果音符已经在播放且不允许重新触发，则不重复创建
    if (this.activeNotes.has(note) && !allowRetrigger) return;
    
    // 如果允许重新触发，先释放当前音符
    if (this.activeNotes.has(note) && allowRetrigger) {
      const noteInfo = this.activeNotes.get(note);
      if (noteInfo && noteInfo.synth) {
        noteInfo.synth.triggerRelease(noteInfo.frequency);
      }
    }
    
    // 使用音频上下文的当前时间（更精确）
    const currentTime = Tone.context.currentTime;
    // 使用当前合成器播放音符
    this.currentSynth.synth.triggerAttack(frequency, currentTime, vel);
    
    // 记录活动音符
    this.activeNotes.set(note, { synth: this.currentSynth.synth, frequency });
  }

  // 停止音符播放
  stopNote(note) {
    if (!this.activeNotes.has(note)) return;
    
    // 使用当前合成器停止播放音符
    const noteInfo = this.activeNotes.get(note);
    if (noteInfo && noteInfo.synth) {
      noteInfo.synth.triggerRelease(noteInfo.frequency);
    }
    
    // 从活动音符中移除
    this.activeNotes.delete(note);
  }

  // 控制全局延迟效果
  setGlobalDelay(params) {
    const { delayTime, feedback, wet } = params;
    if (delayTime !== undefined) this.globalEffects.delay.delayTime.value = Math.max(0, Math.min(5, delayTime)); // 假设delayTime的最大范围是0-5
    if (feedback !== undefined) this.globalEffects.delay.feedback.value = Math.max(0, Math.min(1, feedback));
    if (wet !== undefined) this.globalEffects.delay.wet.value = Math.max(0, Math.min(1, wet));
  }

  // 控制全局混响效果
  setGlobalReverb(params) {
    const { decay, wet } = params;
    if (decay !== undefined) this.globalEffects.reverb.decay = Math.max(0, Math.min(5, decay)); // 直接设置decay属性，并限制范围
    if (wet !== undefined) this.globalEffects.reverb.wet.value = Math.max(0, Math.min(1, wet)); // 对wet参数也进行范围限制
  }

  // 控制全局音量
  setMasterVolume(volume) {
    if (this.globalEffects.masterVolume) {
      this.globalEffects.masterVolume.volume.value = volume;
    }
  }

  // 设置音色独立音量
  setInstrumentVolume(instrument, volume) {
    if (this.synths[instrument]) {
      this.synths[instrument].volume = volume;
      // 如果当前正在使用该音色，需要重新连接效果链
      if (this.currentInstrument === instrument) {
        this.connectEffects();
      }
    }
  }

  // （可选）暴露专属效果器的关键参数控制（如钢琴的失真度）
  setInstrumentEffectParam(instrument, effectIndex, param, value) {
    const effect = this.synths[instrument]?.effects[effectIndex];
    if (effect && effect[param] !== undefined) {
      effect[param].value = value;
    }
  }

  // MIDI音符转频率
  midiToFrequency(note) {
    return Tone.Frequency(note, "midi").toFrequency();
  }

  // 更换音色
  changeInstrument(instrument) {
    if (this.synths[instrument]) {
      // 更新当前音色
      this.currentInstrument = instrument;
      this.currentSynth = this.synths[instrument];
      
      // 重新连接效果链
      this.connectEffects();
    } else {
      console.warn(`音色 ${instrument} 未找到`);
    }
  }


}