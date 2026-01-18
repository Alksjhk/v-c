/**
 * 图片预加载工具
 * 用于提前加载即将显示的图片，提升用户体验
 */

interface PreloadOptions {
  maxConcurrent?: number; // 最大并发加载数
  onProgress?: (loaded: number, total: number) => void; // 进度回调
  onComplete?: () => void; // 完成回调
  onError?: (error: Error, url: string) => void; // 错误回调
}

export class ImagePreloader {
  private queue: string[] = [];
  private loading: Set<string> = new Set();
  private loaded: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private maxConcurrent: number;
  private onProgress?: PreloadOptions['onProgress'];
  private onComplete?: PreloadOptions['onComplete'];
  private onError?: PreloadOptions['onError'];
  private isProcessing = false;

  constructor(options: PreloadOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  /**
   * 添加要预加载的图片URL
   */
  addUrls(urls: string[]): void {
    // 过滤掉已经加载过或正在加载的图片
    const newUrls = urls.filter(url => 
      !this.loaded.has(url) && 
      !this.failed.has(url) && 
      !this.loading.has(url)
    );

    if (newUrls.length === 0) return;

    this.queue.push(...newUrls);
    this.queue = Array.from(new Set(this.queue)); // 去重

    if (!this.isProcessing) {
      this.process();
    }
  }

  /**
   * 预加载单个图片
   */
  async preloadSingle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loaded.has(url) || this.failed.has(url)) {
        resolve();
        return;
      }

      const img = new Image();
      img.src = url;

      img.onload = () => {
        this.loaded.add(url);
        resolve();
      };

      img.onerror = () => {
        this.failed.add(url);
        reject(new Error(`图片加载失败: ${url}`));
      };
    });
  }

  /**
   * 处理队列
   */
  private async process(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // 达到最大并发数，等待
      if (this.loading.size >= this.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const url = this.queue.shift()!;
      this.loading.add(url);

      // 触发进度回调
      if (this.onProgress) {
        this.onProgress(this.loaded.size, this.loaded.size + this.loading.size + this.queue.length);
      }

      try {
        await this.preloadSingle(url);
      } catch (error) {
        if (this.onError) {
          this.onError(error as Error, url);
        }
      } finally {
        this.loading.delete(url);
      }
    }

    // 所有图片加载完成
    this.isProcessing = false;
    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.queue = [];
    this.loading.clear();
    this.loaded.clear();
    this.failed.clear();
    this.isProcessing = false;
  }

  /**
   * 获取加载统计信息
   */
  getStats() {
    return {
      total: this.loaded.size + this.loading.size + this.queue.length,
      loaded: this.loaded.size,
      loading: this.loading.size,
      pending: this.queue.length,
      failed: this.failed.size
    };
  }
}

import { Message } from '../types';

/**
 * 预加载消息列表中的图片
 */
export function preloadMessageImages(messages: Message[], options?: PreloadOptions): ImagePreloader {
  const imageUrls = messages
    .filter(msg => msg.messageType === 'image' && msg.fileUrl)
    .map((msg): string => msg.fileUrl as string);

  const preloader = new ImagePreloader(options);
  preloader.addUrls(imageUrls);

  return preloader;
}

/**
 * 智能预加载：根据滚动位置预加载图片
 */
export function smartPreload(
  messages: Message[],
  currentIndex: number,
  options?: PreloadOptions
): ImagePreloader {
  const preloader = new ImagePreloader(options);

  // 预加载当前图片周围的图片（前后各5张）
  const startIndex = Math.max(0, currentIndex - 5);
  const endIndex = Math.min(messages.length, currentIndex + 6);

  const imagesToPreload = messages
    .slice(startIndex, endIndex)
    .filter(msg => msg.messageType === 'image' && msg.fileUrl)
    .map((msg): string => msg.fileUrl as string);

  preloader.addUrls(imagesToPreload);

  return preloader;
}

/**
 * 获取图片URL列表（去重）
 */
export function extractImageUrls(messages: Message[]): string[] {
  const urlSet = new Set<string>();

  messages.forEach(msg => {
    if (msg.messageType === 'image' && msg.fileUrl) {
      urlSet.add(msg.fileUrl);
    }
  });

  return Array.from(urlSet);
}
