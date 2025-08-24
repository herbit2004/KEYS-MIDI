// 加载管理器模块
export class LoadingManager {
  constructor() {
    // 存储已加载的音色
    this.loadedInstruments = new Set();
    
    // 存储正在加载的音色
    this.loadingInstruments = new Map();
    
    // 创建通知容器
    this.createNotificationContainer();
  }

  // 创建通知容器
  createNotificationContainer() {
    // 检查是否已存在通知容器
    if (document.getElementById('loading-notifications')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'loading-notifications';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(-20px);
        }
      }
      
      @keyframes successPulse {
        0% { background: rgba(255, 255, 255, 0.15); }
        50% { background: rgba(76, 175, 80, 0.8); }
        100% { background: rgba(255, 255, 255, 0.15); }
      }
      
      .loading-notification {
        animation: slideIn 0.3s ease-out;
      }
      
      .loading-notification.removing {
        animation: slideOut 0.3s ease-in;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(container);
  }

  // 创建单个通知框
  createNotification(instrumentId, instrumentName) {
    const notification = document.createElement('div');
    notification.className = 'loading-notification';
    notification.dataset.instrumentId = instrumentId;
    notification.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: 'Arial', sans-serif;
      font-size: 13px;
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    notification.innerHTML = `
        <div class="loading-spinner" style="
        width: 12px;
        height: 12px;
        border: 1.5px solid rgba(255, 255, 255, 0.3);
        border-top: 1.5px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        flex-shrink: 0;
        "></div>
      <span class="loading-text" style="
          overflow: hidden;
        text-overflow: ellipsis;
      ">${instrumentName} 加载中...</span>
    `;

    return notification;
  }

  // 显示加载通知
  showLoadingNotification(instrumentId, instrumentName) {
    const container = document.getElementById('loading-notifications');
    if (!container) return;

    // 检查是否已存在该音色的通知
    const existingNotification = container.querySelector(`[data-instrument-id="${instrumentId}"]`);
    if (existingNotification) {
      return; // 已存在，不重复创建
    }

    const notification = this.createNotification(instrumentId, instrumentName);
    container.appendChild(notification);
  }

  // 显示加载成功
  showLoadingSuccess(instrumentId, instrumentName) {
    const container = document.getElementById('loading-notifications');
    if (!container) return;

    const notification = container.querySelector(`[data-instrument-id="${instrumentId}"]`);
    if (!notification) return;

    const spinner = notification.querySelector('.loading-spinner');
    const text = notification.querySelector('.loading-text');
    
    // 更新为成功状态
      spinner.style.animation = 'none';
      spinner.innerHTML = '✓';
      spinner.style.border = 'none';
      spinner.style.color = 'white';
    spinner.style.fontSize = '12px';
      spinner.style.fontWeight = 'bold';

    text.textContent = `${instrumentName} 加载完成`;

    // 添加成功动画
    notification.classList.add('completed');
    notification.style.animation = 'successPulse 1s ease-in-out';

    // 触发UI更新事件
    this.triggerUIUpdate();

    // 延迟后移除通知
    setTimeout(() => {
      notification.classList.add('removing');
      setTimeout(() => {
        if (notification.parentNode) {
        notification.remove();
        }
      }, 300);
    }, 1500);
  }

  // 触发UI更新
  triggerUIUpdate() {
    // 触发自定义事件，通知MainController更新UI
    const event = new CustomEvent('instrumentLoaded', {
      detail: { timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  // 检查音色是否已加载
  isInstrumentLoaded(instrumentId) {
    return this.loadedInstruments.has(instrumentId);
  }

  // 检查音色是否正在加载
  isInstrumentLoading(instrumentId) {
    return this.loadingInstruments.has(instrumentId);
  }

  // 标记音色为已加载
  markInstrumentLoaded(instrumentId) {
      this.loadedInstruments.add(instrumentId);
    this.loadingInstruments.delete(instrumentId);
  }

  // 标记音色为正在加载
  markInstrumentLoading(instrumentId) {
    this.loadingInstruments.set(instrumentId, true);
  }

  // 获取加载状态
  getLoadingStatus(instrumentId) {
    if (this.isInstrumentLoaded(instrumentId)) {
      return 'loaded';
    } else if (this.isInstrumentLoading(instrumentId)) {
      return 'loading';
        } else {
      return 'not_loaded';
    }
  }
}
