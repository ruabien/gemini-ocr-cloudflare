export const MAX_OCR_IMAGE_DIMENSION = 2200;
export const JPEG_QUALITY = 0.85;
export const OPTIMIZE_THRESHOLD_BYTES = 800 * 1024;

export interface OptimizeResult {
  optimizedBlob: Blob;
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  wasOptimized: boolean;
}

export async function optimizeImageForOcr(file: File): Promise<OptimizeResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve({
        optimizedBlob: file,
        optimizedFile: file,
        originalSize: file.size,
        optimizedSize: file.size,
        width: 0,
        height: 0,
        wasOptimized: false
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const width = img.width;
      const height = img.height;
      const originalSize = file.size;

      const needsOptimization = originalSize > OPTIMIZE_THRESHOLD_BYTES || width > MAX_OCR_IMAGE_DIMENSION || height > MAX_OCR_IMAGE_DIMENSION;

      if (!needsOptimization) {
        resolve({
          optimizedBlob: file,
          optimizedFile: file,
          originalSize,
          optimizedSize: originalSize,
          width,
          height,
          wasOptimized: false
        });
        return;
      }

      let newWidth = width;
      let newHeight = height;

      if (width > MAX_OCR_IMAGE_DIMENSION || height > MAX_OCR_IMAGE_DIMENSION) {
        if (width > height) {
          newHeight = Math.round((height * MAX_OCR_IMAGE_DIMENSION) / width);
          newWidth = MAX_OCR_IMAGE_DIMENSION;
        } else {
          newWidth = Math.round((width * MAX_OCR_IMAGE_DIMENSION) / height);
          newHeight = MAX_OCR_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        if (file.type === 'image/png') {
           ctx.fillStyle = '#FFFFFF';
           ctx.fillRect(0, 0, newWidth, newHeight);
        }
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Lỗi khi tạo Blob cho ảnh tối ưu."));
          return;
        }

        const suffix = "_optimized.jpg";
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + suffix;
        const optimizedFile = new File([blob], newFileName, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        resolve({
          optimizedBlob: blob,
          optimizedFile: optimizedFile,
          originalSize,
          optimizedSize: blob.size,
          width: newWidth,
          height: newHeight,
          wasOptimized: true
        });
      }, 'image/jpeg', JPEG_QUALITY);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Lỗi khi tải ảnh để tối ưu."));
    };

    img.src = objectUrl;
  });
}