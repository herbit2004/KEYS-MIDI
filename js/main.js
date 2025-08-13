// 应用程序入口点
import { MainController } from './MainController.js';

// 当页面加载完成时初始化应用程序
document.addEventListener('DOMContentLoaded', () => {
  // 创建主控制器实例
  const mainController = new MainController();
  
  // 将主控制器实例附加到全局对象以便调试
  window.mainController = mainController;
  
  console.log('虚拟音乐键盘应用程序已启动');
  console.log('使用说明:');
  console.log('- 使用 q 2 w 3 e r 5 t 6 y 7 u i 9 o 0 p [ = ] a z s x c f v g b n j m k , l . / 键演奏');
  console.log('- 使用方向键调整八度和转调');
  console.log('- 支持多键同时按下演奏和弦');
});