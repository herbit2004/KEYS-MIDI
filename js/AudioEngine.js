// 音频引擎模块
export class AudioEngine {
  constructor() {
    // 初始化合成器和音色专属效果器
    this.initSynths();
    
    // 初始化全局共享效果器
    this.initGlobalEffects();
    
    // 存储正在播放的音符
    this.activeNotes = new Map();
    
    // 音色选择（默认为Rhodes）
    this.currentInstrument = 'rhodes';
    
    // 存储手动设置的滤波器频率
    this.manualFilterFrequency = 1000;
    
    // 初始化采样钢琴
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
    
    // 建立默认连接
    this.connectEffects();
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
    // 为每个音色创建独立的合成器和专属效果器实例
    
    // Rhodes 电钢（经典暖调）
    this.synths = {
      rhodes: {
        synth: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "custom",
            // 模拟金属音棒的泛音结构（2、3次泛音突出）
            partials: [1.5, 0.9, 0.5, 0.3, 0.15]
          },
          envelope: {
            attack: 0.01,   // 更短促的音头，提高响应速度
            decay: 2.8,     // 缓慢衰减
            sustain: 0.4,   // 中等持续音量
            release: 1.8    // 长释放模拟音棒余振
          }
        }),
        effects: [
          new Tone.Filter({
            type: "lowpass",
            frequency: 3500, // 削弱高频保留温暖感
            Q: 1.2
          }),
          new Tone.Tremolo({
            rate: 4.5,      // 模拟Rhodes内置颤音效果
            depth: 0.18,    // 轻微颤音避免过度波动
            wet: 0.3
          }),
          new Tone.Reverb({
            roomSize: 0.5,  // 中等房间感
            decay: 1.5,
            wet: 0.25
          })
        ],
        volume: 10 // 音色独立音量控制
      },
      
      // Wurlitzer 电钢（明亮穿透）
      wurlitzer: {
        synth: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "triangle", // 三角波基础+增强泛音
            partials: [1, 0.8, 0.6, 0.4, 0.2]
          },
          envelope: {
            attack: 0.008,  // 更短促的音头，提高响应速度
            decay: 0.6,
            sustain: 0.5,
            release: 1.2    // 中等释放
          }
        }),
        effects: [
          new Tone.Filter({
            type: "bandpass",
            frequency: 1800, // 突出中频核心
            Q: 1.5
          }),
          new Tone.Distortion(0.12), // 极轻微失真模拟电子管温暖感
          new Tone.Reverb({
            roomSize: 0.3,  // 小空间混响
            decay: 1.0,
            wet: 0.2
          })
        ],
        volume: 10 // 音色独立音量控制
      },
      
      // FM 电钢（现代数字感）
      fm: {
        synth: new Tone.PolySynth(Tone.FMSynth, {
          // FM合成参数：载波与调制器的频率比例决定泛音复杂度
          harmonicity: 3.5,  // 调制器频率 = 载波频率 × 3.5
          modulationIndex: 2.8, // 调制深度（值越大泛音越丰富）
          carrier: {
            type: "sine"
          },
          modulator: {
            type: "square"
          },
          envelope: {
            attack: 0.005,
            decay: 0.7,
            sustain: 0.7,
            release: 1.5
          }
        }),
        effects: [
          new Tone.Filter({
            type: "highpass",
            frequency: 600,  // 增强高频明亮度
            Q: 0.8
          }),
          new Tone.Chorus({
            rate: 1.2,       // 快速合唱增强宽度
            depth: 0.2,
            wet: 0.2
          }),
          new Tone.Reverb({
            roomSize: 0.4,
            decay: 1.2,
            wet: 0.2
          })
        ],
        volume: 10 // 音色独立音量控制
      },
      
      // clav 电钢（击弦古钢琴感）
      clav: {
        synth: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "square",  // 方波的奇次泛音增强击弦感
            partialCount: 5  // 限制泛音避免杂乱
          },
          envelope: {
            attack: 0.003,   // 更快的音头，提高响应速度
            decay: 0.3,      // 快速衰减
            sustain: 0.2,    // 持续音量低
            release: 0.6     // 短释放
          }
        }),
        effects: [
          new Tone.Filter({
            type: "highpass",
            frequency: 1200, // 突出高频击弦噪音
            Q: 1.0
          }),
          new Tone.Compressor({
            threshold: -16,  // 强压缩增强击弦力度
            ratio: 5
          }),
          new Tone.Delay({
            delayTime: "16n", // 16分音符短延迟增强律动感
            feedback: 0.25,
            wet: 0.2
          })
        ],
        volume: 10 // 音色独立音量控制
      },
      
      // Rhodes Mark II（增强版）
      rhodesMarkII: {
        synth: new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "custom",
            partials: [1, 0.8, 0.6, 0.5, 0.3, 0.2] // 增强低次泛音
          },
          envelope: {
            attack: 0.01,   // 更短促的音头，提高响应速度
            decay: 1.0,
            sustain: 0.7,
            release: 1.7 // 固定释放时间
          }
        }),
        effects: [
          new Tone.Filter({
            type: "lowpass",
            frequency: 4000,
            Q: 1.3
          }),
          new Tone.Distortion(0.2), // 中等失真增强厚度
          new Tone.Tremolo({
            rate: 4.0,
            depth: 0.15
          }),
          new Tone.Reverb({
            roomSize: 0.6,
            decay: 2.0,
            wet: 0.3
          })
        ],
        volume: 10 // 音色独立音量控制
      }
    };
    
    // 默认使用Rhodes音色
    this.currentSynth = this.synths.rhodes;
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
    
    // 优先使用采样钢琴
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