// 音频引擎模块
export class AudioEngine {
  constructor() {
    // 初始化合成器和音色专属效果器
    this.initSynths();
    
    // 初始化全局共享效果器
    this.initGlobalEffects();
    
    // 存储正在播放的音符
    this.activeNotes = new Map();
    
    // 音色选择（将在配置加载后设置）
    this.currentInstrument = null;
    
    // 存储手动设置的滤波器频率
    this.manualFilterFrequency = 1000;
    
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
      case 'Sampler':
        // 采样器类型，需要动态创建
        synth = this.createSampler(synthOptions);
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
          case 'Vibrato':
            effect = new Tone.Vibrato(effectOptions);
            break;
          case 'EQ3':
            effect = new Tone.EQ3(effectOptions);
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
      volume: config.volume || 0,
      type: config.synth.type // 添加类型标识
    };
  }

  // 通用的采样器创建方法
  createSampler(options) {
    const {
      baseUrl,
      urls,
      ...samplerOptions
    } = options;

    if (!urls || Object.keys(urls).length === 0) {
      console.warn('采样器配置中没有提供urls映射');
      return null;
    }

    console.log('创建采样器:', {
      baseUrl,
      noteCount: Object.keys(urls).length,
      notes: Object.keys(urls)
    });

    return new Tone.Sampler({
      urls: urls,
      baseUrl: baseUrl,
      ...samplerOptions
    });
  }

  // 从配置文件初始化所有音色
  async initSynthsWithConfig(config) {
    this.synths = {};
    
    // 按JSON中的顺序创建所有音色
    for (const instrumentId in config.instruments) {
      const instrumentConfig = config.instruments[instrumentId];
      try {
        this.synths[instrumentId] = this.createInstrumentFromConfig(instrumentConfig);
        console.log(`音色 ${instrumentId} 创建成功`);
      } catch (error) {
        console.error(`创建音色 ${instrumentId} 时出错:`, error);
      }
    }
    
    // 设置默认音色（JSON中的第一个音色）
    if (Object.keys(this.synths).length > 0) {
      const firstInstrumentId = Object.keys(this.synths)[0];
      this.currentInstrument = firstInstrumentId;
      this.currentSynth = this.synths[firstInstrumentId];
      console.log(`设置默认音色: ${firstInstrumentId}`);
      
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

  // 统一的音色连接方法
  connectEffects() {
    if (!this.currentSynth) return;

    // 断开当前连接
    this.disconnectCurrentInstrument();
    
    // 根据音色类型进行连接
    if (this.currentSynth.type === 'Sampler') {
      this.connectSamplerEffects();
    } else {
      this.connectSynthEffects();
    }
  }

  // 断开当前音色连接
  disconnectCurrentInstrument() {
    if (this.currentSynth) {
      if (this.currentSynth.synth) {
        this.currentSynth.synth.disconnect();
      }
      
      // 断开当前音色效果链中各节点的连接
      this.currentSynth.effects.forEach(effect => {
        effect.disconnect();
      });
    }
  }

  // 连接采样器效果链
  connectSamplerEffects() {
    const sampler = this.currentSynth.synth;
    
    // 应用采样器的音量控制
    if (!this.currentSynth.volumeNode) {
      this.currentSynth.volumeNode = new Tone.Volume(this.currentSynth.volume);
    } else {
      this.currentSynth.volumeNode.volume.value = this.currentSynth.volume;
    }
    
    // 连接采样器到效果链
    sampler.connect(this.currentSynth.volumeNode);
    this.currentSynth.volumeNode.connect(this.globalEffects.delay);
  }

  // 连接合成器效果链
  connectSynthEffects() {
    let lastNode = this.currentSynth.synth;
    
    // 连接音色的专属效果链
    this.currentSynth.effects.forEach(effect => {
      lastNode.connect(effect);
      lastNode = effect;
    });
    
    // 应用音色的独立音量控制
    if (!this.currentSynth.volumeNode) {
      this.currentSynth.volumeNode = new Tone.Volume(this.currentSynth.volume);
    } else {
      this.currentSynth.volumeNode.volume.value = this.currentSynth.volume;
    }
    lastNode.connect(this.currentSynth.volumeNode);
    lastNode = this.currentSynth.volumeNode;
    
    // 连接全局效果链
    lastNode.connect(this.globalEffects.delay);
  }

  // 统一的音符播放方法
  playNote(note, velocity = 100, allowRetrigger = false) {
    const vel = velocity / 127; // 归一化到0-1
    
    // 如果音符已经在播放且不允许重新触发，则不重复创建
    if (this.activeNotes.has(note) && !allowRetrigger) return;
    
    // 如果允许重新触发，先释放当前音符
    if (this.activeNotes.has(note) && allowRetrigger) {
      this.stopNote(note);
    }
    
    // 根据音色类型播放音符
    if (this.currentSynth.type === 'Sampler') {
      this.playSamplerNote(note, vel);
    } else {
      this.playSynthNote(note, vel);
    }
  }

  // 播放采样器音符
  playSamplerNote(note, velocity) {
    const noteName = Tone.Midi(note).toNote();
    this.currentSynth.synth.triggerAttack(noteName, Tone.context.currentTime, velocity);
    this.activeNotes.set(note, { 
      synth: this.currentSynth.synth, 
      noteName,
      type: 'sampler'
    });
  }

  // 播放合成器音符
  playSynthNote(note, velocity) {
    const frequency = Tone.Midi(note).toFrequency();
    this.currentSynth.synth.triggerAttack(frequency, Tone.context.currentTime, velocity);
    this.activeNotes.set(note, { 
      synth: this.currentSynth.synth, 
      frequency,
      type: 'synth'
    });
  }

  // 统一的音符停止方法
  stopNote(note) {
    if (!this.activeNotes.has(note)) return;
    
    const noteInfo = this.activeNotes.get(note);
    
    if (noteInfo.type === 'sampler') {
      // 采样器音符
      noteInfo.synth.triggerRelease(noteInfo.noteName);
    } else {
      // 合成器音符
      noteInfo.synth.triggerRelease(noteInfo.frequency);
    }
    
    // 从活动音符中移除
    this.activeNotes.delete(note);
  }

  // 控制全局延迟效果
  setGlobalDelay(params) {
    const { delayTime, feedback, wet } = params;
    if (delayTime !== undefined) this.globalEffects.delay.delayTime.value = Math.max(0, Math.min(5, delayTime));
    if (feedback !== undefined) this.globalEffects.delay.feedback.value = Math.max(0, Math.min(1, feedback));
    if (wet !== undefined) this.globalEffects.delay.wet.value = Math.max(0, Math.min(1, wet));
  }

  // 控制全局混响效果
  setGlobalReverb(params) {
    const { decay, wet } = params;
    if (decay !== undefined) this.globalEffects.reverb.decay = Math.max(0, Math.min(5, decay));
    if (wet !== undefined) this.globalEffects.reverb.wet.value = Math.max(0, Math.min(1, wet));
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

  // 暴露专属效果器的关键参数控制
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