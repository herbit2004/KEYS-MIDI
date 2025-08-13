// 音色配置加载器
export class InstrumentConfig {
  constructor() {
    this.instruments = {};
  }

  // 异步加载音色配置
  async loadConfig(configPath = '../instruments.json') {
    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`无法加载配置文件: ${response.status} ${response.statusText}`);
      }
      const config = await response.json();
      this.instruments = config.instruments || {};
      return this.instruments;
    } catch (error) {
      console.error('加载音色配置时出错:', error);
      throw error;
    }
  }

  // 获取所有音色ID
  getInstrumentIds() {
    return Object.keys(this.instruments);
  }

  // 获取音色配置
  getInstrumentConfig(instrumentId) {
    return this.instruments[instrumentId];
  }

  // 获取音色名称
  getInstrumentName(instrumentId) {
    const config = this.instruments[instrumentId];
    return config ? config.name : instrumentId;
  }

  // 获取所有音色名称映射
  getAllInstrumentNames() {
    const names = {};
    for (const id in this.instruments) {
      names[id] = this.getInstrumentName(id);
    }
    return names;
  }
}