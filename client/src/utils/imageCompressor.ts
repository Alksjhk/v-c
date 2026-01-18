/**
 * 图片压缩工具
 * 使用 compressorjs 进行客户端图片压缩
 */

import Compressor from 'compressorjs';

export interface CompressionOptions {
  // 压缩质量 (0-1)，默认 0.7
  quality?: number;
  // 最大宽度
  maxWidth?: number;
  // 最大高度
  maxHeight?: number;
  // 转换为目标类型，默认保持原格式
  convertTypes?: 'image/jpeg' | 'image/png' | 'image/webp';
  // 是否使用 Web Worker 进行异步压缩，默认 true
  useWebWorker?: boolean;
  // 压缩成功回调
  success?: (result: File) => void;
  // 压缩失败回调
  error?: (err: Error) => void;
}

/**
 * 压缩图片文件
 * @param file 原始文件
 * @param options 压缩选项
 * @returns Promise<File> 压缩后的文件
 */
export function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  return new Promise((resolve, reject) => {
    console.log('开始压缩图片:', file.name, '大小:', file.size, '类型:', file.type);

    // 检查是否为图片文件
    if (!file.type.startsWith('image/')) {
      console.error('不是图片文件:', file.type);
      reject(new Error('只能压缩图片文件'));
      return;
    }

    const defaultOptions: CompressionOptions = {
      quality: 0.7,
      maxWidth: 1920,
      maxHeight: 1920,
      useWebWorker: true,
      ...options
    };

    console.log('压缩配置:', defaultOptions);

    new Compressor(file, {
      quality: defaultOptions.quality,
      maxWidth: defaultOptions.maxWidth,
      maxHeight: defaultOptions.maxHeight,
      mimeType: defaultOptions.convertTypes,
      success(result) {
        // result 可能是 File | Blob，需要转换为 File
        const resultFile = result instanceof File ? result : new File([result], file.name, {
          type: defaultOptions.convertTypes || file.type,
          lastModified: file.lastModified
        });

        console.log('压缩成功:', resultFile.name, '大小:', resultFile.size, '原始大小:', file.size);
        if (defaultOptions.success) {
          defaultOptions.success(resultFile);
        }
        resolve(resultFile);
      },
      error(err) {
        console.error('压缩失败:', err);
        if (defaultOptions.error) {
          defaultOptions.error(err);
        }
        reject(err);
      },
    });
  });
}

/**
 * 判断文件是否需要压缩
 * @param file 文件对象
 * @param maxSizeMB 阈值大小（MB），默认 1MB
 * @returns boolean 是否需要压缩
 */
export function shouldCompress(file: File, maxSizeMB: number = 1): boolean {
  // 只压缩图片文件
  if (!file.type.startsWith('image/')) {
    return false;
  }
  
  // 文件超过阈值才压缩
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size > maxSizeBytes;
}

/**
 * 预设压缩配置
 */
export const CompressionPresets = {
  // 高质量：保留更多细节，适合风景照
  HIGH_QUALITY: {
    quality: 0.85,
    maxWidth: 2048,
    maxHeight: 2048,
    convertTypes: 'image/jpeg' as const
  },
  
  // 标准：平衡质量和文件大小，适合聊天场景
  STANDARD: {
    quality: 0.75,
    maxWidth: 1280,
    maxHeight: 1280,
    convertTypes: 'image/jpeg' as const
  },

  // 快速上传：优先文件大小，适合网络较差场景
  FAST_UPLOAD: {
    quality: 0.6,
    maxWidth: 1024,
    maxHeight: 1024,
    convertTypes: 'image/webp' as const
  },
  
  // 缩略图：极小文件，适合预览
  THUMBNAIL: {
    quality: 0.6,
    maxWidth: 400,
    maxHeight: 400,
    convertTypes: 'image/webp' as const
  }
};

/**
 * 获取压缩进度信息
 * @param originalSize 原始大小（字节）
 * @param compressedSize 压缩后大小（字节）
 * @returns 压缩信息对象
 */
export function getCompressionInfo(originalSize: number, compressedSize: number) {
  const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
  const compressedMB = (compressedSize / 1024 / 1024).toFixed(2);
  
  return {
    originalSize,
    compressedSize,
    compressionRatio: `${compressionRatio}%`,
    compressedSizeMB: `${compressedMB}MB`,
    isCompressed: compressedSize < originalSize
  };
}
