// 音频引擎模块
import { LoadingManager } from './LoadingManager.js';

export class AudioEngine {
  constructor() {
    // 初始化加载管理器
    this.loadingManager = new LoadingManager();
    
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
      loop,
      loopStart,
      loopEnd,
      ...samplerOptions
    } = options;

    if (!urls || Object.keys(urls).length === 0) {
      console.warn('采样器配置中没有提供urls映射');
      return null;
    }

    // 准备采样器选项，包括可能的loop参数
    const samplerConfig = {
      urls: urls,
      baseUrl: baseUrl,
      ...samplerOptions
    };
    
    // 如果配置了loop相关参数，添加到采样器配置中
    if (loop !== undefined) {
      samplerConfig.loop = loop;
      
      // 添加loopStart和loopEnd参数（如果存在）
      if (loopStart !== undefined) {
        samplerConfig.loopStart = loopStart;
      }
      if (loopEnd !== undefined) {
        samplerConfig.loopEnd = loopEnd;
      }
    }

    console.log('创建采样器:', {
      baseUrl,
      noteCount: Object.keys(urls).length,
      notes: Object.keys(urls),
      hasLoop: loop === true
    });

    return new Tone.Sampler(samplerConfig);
  }

  // 懒加载音色
  async loadInstrumentLazy(instrumentId) {
    // 检查是否已加载
    if (this.loadingManager.isInstrumentLoaded(instrumentId)) {
      console.log(`音色 ${instrumentId} 已加载，直接返回`);
      this.currentSynth = this.synths[instrumentId];
      this.connectEffects();
      return this.synths[instrumentId];
    }

    // 检查是否正在加载
    if (this.loadingManager.isInstrumentLoading(instrumentId)) {
      console.log(`音色 ${instrumentId} 正在加载中，等待完成`);
      // 等待加载完成
      while (this.loadingManager.isInstrumentLoading(instrumentId)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      this.currentSynth = this.synths[instrumentId];
      this.connectEffects();
      return this.synths[instrumentId];
    }

    // 标记为正在加载
    this.loadingManager.markInstrumentLoading(instrumentId);

    try {
      const instrumentConfig = this.instrumentConfigs[instrumentId];
      if (!instrumentConfig) {
        throw new Error(`找不到音色配置: ${instrumentId}`);
      }

      // 显示加载通知
      this.loadingManager.showLoadingNotification(instrumentId, instrumentConfig.name);

      // 创建音色
      const instrument = this.createInstrumentFromConfig(instrumentConfig);
      this.synths[instrumentId] = instrument;

      // 如果是采样器，等待加载完成
      if (instrumentConfig.synth.type === 'Sampler') {
        await this.loadSamplerWithProgress(instrumentId, instrumentConfig);
      }

      // 标记为已加载
      this.loadingManager.markInstrumentLoaded(instrumentId);

      // 显示加载成功
      this.loadingManager.showLoadingSuccess(instrumentId, instrumentConfig.name);

      // 设置当前音色（如果是第一次加载）
      if (!this.currentSynth) {
        this.currentSynth = instrument;
        this.connectEffects();
      }

      // 确保所有加载的音色都连接到输出
      this.connectInstrumentToOutput(instrument);

      console.log(`音色 ${instrumentId} 懒加载完成`);
      return instrument;

    } catch (error) {
      console.error(`音色 ${instrumentId} 懒加载失败:`, error);
      this.loadingManager.markInstrumentLoading(instrumentId); // 移除加载状态
      throw error;
    }
  }

  // 采样器加载
  async loadSamplerWithProgress(instrumentId, instrumentConfig) {
    const sampler = this.synths[instrumentId].synth;
    const urls = instrumentConfig.synth.options.urls;
    const totalFiles = Object.keys(urls).length;

    console.log(`开始加载采样器 ${instrumentId}:`, {
      totalFiles,
      notes: Object.keys(urls)
    });

    // 等待Tone.js Sampler加载完成
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = 1000; // 最大检查次数，防止无限循环
      
      // 尝试使用Tone.js的内置加载事件
      if (sampler.onload) {
        console.log(`采样器 ${instrumentId} 使用内置onload事件`);
        sampler.onload = () => {
          console.log(`采样器 ${instrumentId} 通过onload事件完成加载`);
          resolve();
        };
        return;
      }
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // 简化的加载检查逻辑
        let isLoaded = false;
        
        // 检查sampler是否已经可用
        if (sampler.loaded === true) {
          isLoaded = true;
        } else if (sampler._buffers && Object.keys(sampler._buffers).length >= totalFiles) {
          isLoaded = true;
        } else if (sampler.buffers && Object.keys(sampler.buffers).length >= totalFiles) {
          isLoaded = true;
        }
        
        // 每20次检查输出一次状态
        if (checkCount % 20 === 0) {
          console.log(`采样器 ${instrumentId} 状态检查:`, {
            checkCount,
            isLoaded,
            samplerLoaded: sampler.loaded,
            hasBuffers: !!sampler._buffers,
            buffersCount: sampler._buffers ? Object.keys(sampler._buffers).length : 0,
            totalFiles
          });
        }
        
        // 如果检测到加载完成，立即结束
        if (isLoaded) {
          clearInterval(checkInterval);
          console.log(`采样器 ${instrumentId} 加载完成`);
          resolve();
          return;
        }
        
        // 防止无限循环
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          console.warn(`采样器 ${instrumentId} 检查次数超限，但采样器可能已经可用`);
          console.log(`最终状态:`, {
            samplerLoaded: sampler.loaded,
            hasBuffers: !!sampler._buffers,
            buffersCount: sampler._buffers ? Object.keys(sampler._buffers).length : 0,
            totalFiles
          });
          // 即使超限也认为加载完成，因为采样器可能已经可用
          resolve();
        }
      }, 100);

      // 移除超时限制，让加载完全完成
      // 只有在真正需要时才设置超时，比如网络问题
      // setTimeout(() => {
      //   clearInterval(checkInterval);
      //   console.warn(`采样器 ${instrumentId} 加载超时`);
      //   resolve(); // 不抛出错误，允许部分加载
      // }, 30000); // 30秒超时
    });
  }

  // 从配置文件初始化所有音色
  async initSynthsWithConfig(config) {
    this.synths = {};
    this.instrumentConfigs = config.instruments;
    
    // 设置默认音色（JSON中的第一个音色）
    if (Object.keys(this.instrumentConfigs).length > 0) {
      const firstInstrumentId = Object.keys(this.instrumentConfigs)[0];
      this.currentInstrument = firstInstrumentId;
      
      // 懒加载默认音色
      await this.loadInstrumentLazy(firstInstrumentId);
      
      console.log(`初始化完成，默认音色: ${firstInstrumentId}`);
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
  async playNote(note, velocity = 100, allowRetrigger = false, instrumentId = null) {
    const vel = velocity / 127; // 归一化到0-1
    
    // 确定要使用的音色
    const targetInstrument = instrumentId || this.currentInstrument;
    
    // 创建音符和音色的唯一标识符
    const noteKey = `${note}-${targetInstrument}`;
    
    // 如果音符已经在播放且不允许重新触发，则不重复创建
    if (this.activeNotes.has(noteKey) && !allowRetrigger) return;
    
    // 如果允许重新触发，先释放当前音符
    if (this.activeNotes.has(noteKey) && allowRetrigger) {
      this.stopNote(note, targetInstrument);
    }
    
    // 确保目标音色已加载（懒加载）
    if (!this.synths[targetInstrument]) {
      try {
        await this.loadInstrumentLazy(targetInstrument);
      } catch (error) {
        console.warn(`音色 ${targetInstrument} 加载失败，使用默认音色`);
        this.playNoteWithSynth(note, vel, this.currentSynth, targetInstrument);
        return;
      }
    }
    
    // 使用指定音色播放音符
    this.playNoteWithSynth(note, vel, this.synths[targetInstrument], targetInstrument);
  }

  // 使用指定合成器播放音符
  playNoteWithSynth(note, velocity, synth, instrumentId) {
    if (synth.type === 'Sampler') {
      this.playSamplerNoteWithSynth(note, velocity, synth, instrumentId);
    } else {
      this.playSynthNoteWithSynth(note, velocity, synth, instrumentId);
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

  // 使用指定合成器播放采样器音符
  playSamplerNoteWithSynth(note, velocity, synth, instrumentId) {
    const noteName = Tone.Midi(note).toNote();
    
    // 标准播放方式
    synth.synth.triggerAttack(noteName, Tone.context.currentTime, velocity);
    
    const noteKey = `${note}-${instrumentId}`;
    this.activeNotes.set(noteKey, {
      synth: synth.synth,
      noteName,
      type: 'sampler',
      instrumentId: instrumentId,
      startTime: Tone.context.currentTime
    });
  }
  


  // 使用指定合成器播放合成器音符
  playSynthNoteWithSynth(note, velocity, synth, instrumentId) {
    const frequency = Tone.Midi(note).toFrequency();
    synth.synth.triggerAttack(frequency, Tone.context.currentTime, velocity);
    const noteKey = `${note}-${instrumentId}`;
    this.activeNotes.set(noteKey, { 
      synth: synth.synth, 
      frequency,
      type: 'synth',
      instrumentId: instrumentId
    });
  }



  // 连接音色到输出
  connectInstrumentToOutput(instrument) {
    if (!instrument) return;
    
    // 断开之前的连接
    if (instrument.synth) {
      instrument.synth.disconnect();
    }
    
    // 根据音色类型连接
    if (instrument.type === 'Sampler') {
      this.connectSamplerToOutput(instrument);
    } else {
      this.connectSynthToOutput(instrument);
    }
  }

  // 连接采样器到输出
  connectSamplerToOutput(instrument) {
    const sampler = instrument.synth;
    
    // 应用采样器的音量控制
    if (!instrument.volumeNode) {
      instrument.volumeNode = new Tone.Volume(instrument.volume);
    } else {
      instrument.volumeNode.volume.value = instrument.volume;
    }
    
    // 连接采样器到效果链
    sampler.connect(instrument.volumeNode);
    instrument.volumeNode.connect(this.globalEffects.delay);
  }

  // 连接合成器到输出
  connectSynthToOutput(instrument) {
    let lastNode = instrument.synth;
    
    // 连接音色的专属效果链
    instrument.effects.forEach(effect => {
      lastNode.connect(effect);
      lastNode = effect;
    });
    
    // 应用音色的独立音量控制
    if (!instrument.volumeNode) {
      instrument.volumeNode = new Tone.Volume(instrument.volume);
    } else {
      instrument.volumeNode.volume.value = instrument.volume;
    }
    lastNode.connect(instrument.volumeNode);
    lastNode = instrument.volumeNode;
    
    // 连接全局效果链
    lastNode.connect(this.globalEffects.delay);
  }

  // 统一的音符停止方法
  stopNote(note, instrumentId = null) {
    // 如果没有指定音色，尝试查找所有匹配的音符
    if (!instrumentId) {
      // 查找所有以该音符开头的键
      for (const [key, noteInfo] of this.activeNotes.entries()) {
        if (key.startsWith(`${note}-`)) {
          this.stopNote(note, noteInfo.instrumentId);
        }
      }
      return;
    }
    
    const noteKey = `${note}-${instrumentId}`;
    if (!this.activeNotes.has(noteKey)) return;
    
    const noteInfo = this.activeNotes.get(noteKey);
    
    if (noteInfo.type === 'sampler') {
      // 采样器音符 - 对于带有loop的采样，确保完全停止循环
      if (noteInfo.hasLoop) {
        // 对于带有loop的采样，确保停止所有循环
        try {
          // 首先尝试常规的triggerRelease
          noteInfo.synth.triggerRelease(noteInfo.noteName);
          
          // 从自定义循环系统中移除循环信息
          if (this.customLoopSystem && this.customLoopSystem.activeLoops) {
            this.customLoopSystem.activeLoops.delete(noteKey);
            console.log(`从循环系统中移除: ${noteInfo.noteName}`);
          }
          
          // 额外的安全措施：检查是否有其他方法可以强制停止采样
          if (noteInfo.synth._players && noteInfo.synth._players[noteInfo.noteName]) {
            const player = noteInfo.synth._players[noteInfo.noteName];
            if (player.stop) {
              player.stop();
            }
          }
        } catch (error) {
          console.warn('停止带有loop的采样时出错:', error);
        }
      } else {
        // 常规采样停止
        noteInfo.synth.triggerRelease(noteInfo.noteName);
      }
    } else {
      // 合成器音符
      noteInfo.synth.triggerRelease(noteInfo.frequency);
    }
    
    // 从活动音符中移除
    this.activeNotes.delete(noteKey);
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
    const { decay, wet, predelay } = params;
    if (decay !== undefined) this.globalEffects.reverb.decay = Math.max(0, Math.min(5, decay));
    if (wet !== undefined) this.globalEffects.reverb.wet.value = Math.max(0, Math.min(1, wet));
    if (predelay !== undefined) this.globalEffects.reverb.predelay = Math.max(0, Math.min(0.1, predelay));
  }

  // 控制全局延迟wet值
  setGlobalDelayWet(wet) {
    this.globalEffects.delay.wet.value = Math.max(0, Math.min(1, wet));
  }

  // 控制全局混响预延迟
  setGlobalReverbPredelay(predelay) {
    this.globalEffects.reverb.predelay = Math.max(0, Math.min(0.1, predelay));
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
  async changeInstrument(instrument) {
    try {
      // 懒加载音色
      await this.loadInstrumentLazy(instrument);
      
      // 更新当前音色
      this.currentInstrument = instrument;
      this.currentSynth = this.synths[instrument];
      
      // 重新连接效果链
      this.connectEffects();
    } catch (error) {
      console.error(`切换音色 ${instrument} 失败:`, error);
    }
  }
}