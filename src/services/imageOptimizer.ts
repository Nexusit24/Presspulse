/**
 * High-performance client-side WebP conversion and intelligent image compression
 * Converts gallery and camera images into ultra-optimized WebP format while preserving crisp visual quality.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  compressedWidth: number;
  compressedHeight: number;
  savingsPercentage: number;
  format: 'image/webp';
}

export interface CompressionOptions {
  maxDimension?: number; // default 1600px for retina blogging standard
  quality?: number; // 0.1 to 1.0, default 0.82
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Converts any image file (JPEG, PNG, HEIC, GIF, BMP) to WebP with smart resizing and high visual quality preservation.
 */
export async function convertToWebP(
  sourceFile: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const maxDimension = options.maxDimension || 1600;
  const quality = options.quality !== undefined ? options.quality : 0.82;

  return new Promise((resolve, reject) => {
    // 1. Create FileReader to load the image into memory
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to decode image data for WebP conversion.'));
      };

      img.onload = () => {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // Calculate aspect-ratio-preserved dimensions
        let targetW = origW;
        let targetH = origH;

        if (origW > maxDimension || origH > maxDimension) {
          if (origW >= origH) {
            targetW = maxDimension;
            targetH = Math.round((origH * maxDimension) / origW);
          } else {
            targetH = maxDimension;
            targetW = Math.round((origW * maxDimension) / origH);
          }
        }

        // Draw onto Canvas with high-quality bicubic smoothing
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not access HTML5 2D Canvas context.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Convert canvas to WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Browser failed to encode image to WebP format.'));
              return;
            }

            // Derive clean .webp filename
            const cleanBaseName = sourceFile.name
              .replace(/\.[^/.]+$/, '')
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .toLowerCase();
            const webpFileName = `${cleanBaseName || 'featured_image'}.webp`;

            const webpFile = new File([blob], webpFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const originalSize = sourceFile.size;
            const compressedSize = blob.size;
            const savings = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: webpFile,
              previewUrl,
              originalSize,
              compressedSize,
              originalWidth: origW,
              originalHeight: origH,
              compressedWidth: targetW,
              compressedHeight: targetH,
              savingsPercentage: savings,
              format: 'image/webp',
            });
          },
          'image/webp',
          quality
        );
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(sourceFile);
  });
}
