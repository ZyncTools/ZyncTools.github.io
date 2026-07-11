/**
 * @file Image Utilities
 * Image processing, conversion, and manipulation utilities
 * @module utils/image
 */

import { readFileAsArrayBuffer, createObjectURL, revokeObjectURL } from './file.js';

/**
 * @typedef {Object} ImageDimensions
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 */

/**
 * @typedef {Object} ImageInfo
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {string} format - Image format
 * @property {number} size - File size in bytes
 * @property {string} mimeType - MIME type
 */

/**
 * @typedef {Object} ResizeOptions
 * @property {number} [maxWidth] - Maximum width
 * @property {number} [maxHeight] - Maximum height
 * @property {number} [width] - Exact width (overrides maxWidth)
 * @property {number} [height] - Exact height (overrides maxHeight)
 * @property {boolean} [maintainAspect=true] - Maintain aspect ratio
 * @property {string} [fit='contain'] - Fit mode: 'contain', 'cover', 'fill'
 * @property {string} [background='#ffffff'] - Background color for padding
 * @property {number} [quality=0.92] - JPEG/WebP quality (0-1)
 * @property {string} [format] - Output format: 'jpeg', 'png', 'webp', 'avif'
 */

/**
 * @typedef {Object} ConvertOptions
 * @property {string} format - Output format: 'jpeg', 'png', 'webp', 'avif', 'bmp'
 * @property {number} [quality=0.92] - Quality for lossy formats (0-1)
 * @property {string} [background='#ffffff'] - Background for transparent images
 * @property {ResizeOptions} [resize] - Resize options
 */

/**
 * Get image dimensions from file
 * @param {File|Blob} file - Image file
 * @returns {Promise<ImageDimensions>} Image dimensions
 */
export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Get detailed image info
 * @param {File|Blob} file - Image file
 * @returns {Promise<ImageInfo>} Image information
 */
export async function getImageInfo(file) {
  const { width, height } = await getImageDimensions(file);
  return {
    width,
    height,
    format: getImageFormat(file),
    size: file.size,
    mimeType: file.type
  };
}

/**
 * Detect image format from file header
 * @param {File|Blob} file - Image file
 * @returns {Promise<string>} Format name
 */
export async function getImageFormat(file) {
  const buffer = await readFileAsArrayBuffer(file.slice(0, 12));
  const header = new Uint8Array(buffer);
  
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return 'png';
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return 'jpeg';
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) return 'gif';
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) return 'webp';
  if (header[0] === 0x42 && header[1] === 0x4D) return 'bmp';
  if ((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00) ||
      (header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A)) return 'tiff';
  if (header[0] === 0x00 && header[1] === 0x00 && header[2] === 0x01 && header[3] === 0x00) return 'ico';
  
  // Check for AVIF
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    const brand = new TextDecoder().decode(header.slice(8, 12));
    if (brand.includes('avif') || brand.includes('avis')) return 'avif';
  }
  
  // Check for HEIC/HEIF
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    const brand = new TextDecoder().decode(header.slice(8, 12));
    if (brand.includes('heic') || brand.includes('heix') || brand.includes('hevc') || brand.includes('hevx')) return 'heic';
    if (brand.includes('mif1') || brand.includes('msf1')) return 'heif';
  }
  
  return 'unknown';
}

/**
 * Load image from file/blob
 * @param {File|Blob} file - Image file
 * @returns {Promise<HTMLImageElement>} Loaded image element
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Create canvas with image drawn
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|VideoFrame} source - Image source
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HTMLCanvasElement} Canvas element
 */
export function createCanvas(source, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Resize image with various fit modes
 * @param {HTMLImageElement|HTMLCanvasElement} source - Source image
 * @param {ResizeOptions} options - Resize options
 * @returns {HTMLCanvasElement} Resized canvas
 */
export function resizeImage(source, options = {}) {
  const {
    maxWidth,
    maxHeight,
    width,
    height,
    maintainAspect = true,
    fit = 'contain',
    background = '#ffffff'
  } = options;
  
  const srcWidth = source.naturalWidth || source.width;
  const srcHeight = source.naturalHeight || source.height;
  
  let destWidth, destHeight;
  
  if (width && height) {
    // Exact dimensions specified
    destWidth = width;
    destHeight = height;
  } else if (width) {
    // Width specified, calculate height
    destWidth = width;
    destHeight = maintainAspect ? Math.round(srcHeight * width / srcWidth) : srcHeight;
  } else if (height) {
    // Height specified, calculate width
    destHeight = height;
    destWidth = maintainAspect ? Math.round(srcWidth * height / srcHeight) : srcWidth;
  } else if (maxWidth || maxHeight) {
    // Fit within max dimensions
    let scale = 1;
    if (maxWidth) scale = Math.min(scale, maxWidth / srcWidth);
    if (maxHeight) scale = Math.min(scale, maxHeight / srcHeight);
    destWidth = Math.round(srcWidth * scale);
    destHeight = Math.round(srcHeight * scale);
  } else {
    // No constraints
    destWidth = srcWidth;
    destHeight = srcHeight;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (fit === 'fill' || (!maintainAspect && width && height)) {
    // Stretch to fill
    canvas.width = destWidth;
    canvas.height = destHeight;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, destWidth, destHeight);
    ctx.drawImage(source, 0, 0, destWidth, destHeight);
  } else if (fit === 'cover') {
    // Cover - crop to fill
    const scale = Math.max(destWidth / srcWidth, destHeight / srcHeight);
    const drawWidth = srcWidth * scale;
    const drawHeight = srcHeight * scale;
    const offsetX = (destWidth - drawWidth) / 2;
    const offsetY = (destHeight - drawHeight) / 2;
    
    canvas.width = destWidth;
    canvas.height = destHeight;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, destWidth, destHeight);
    ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    // Contain - fit entirely (default)
    const scale = Math.min(destWidth / srcWidth, destHeight / srcHeight);
    const drawWidth = srcWidth * scale;
    const drawHeight = srcHeight * scale;
    const offsetX = (destWidth - drawWidth) / 2;
    const offsetY = (destHeight - drawHeight) / 2;
    
    canvas.width = destWidth;
    canvas.height = destHeight;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, destWidth, destHeight);
    ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
  }
  
  return canvas;
}

/**
 * Convert canvas to blob
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} format - Output format (image/jpeg, image/png, image/webp, image/avif)
 * @param {number} quality - Quality (0-1)
 * @returns {Promise<Blob>} Image blob
 */
export function canvasToBlob(canvas, format = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to blob conversion failed'));
      },
      format,
      quality
    );
  });
}

/**
 * Convert image file to another format
 * @param {File|Blob} file - Source image
 * @param {ConvertOptions} options - Conversion options
 * @returns {Promise<Blob>} Converted image blob
 */
export async function convertImage(file, options) {
  const { format, quality = 0.92, background = '#ffffff', resize } = options;
  
  const img = await loadImage(file);
  let canvas;
  
  if (resize) {
    canvas = resizeImage(img, { ...resize, background });
  } else {
    canvas = createCanvas(img, img.naturalWidth, img.naturalHeight);
  }
  
  // Handle transparency for JPEG
  const mimeType = `image/${format}`;
  const needsBackground = (format === 'jpeg' || format === 'jpg' || format === 'bmp') && 
                          (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml');
  
  if (needsBackground) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if image has transparency
    let hasTransparency = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasTransparency = true;
        break;
      }
    }
    
    if (hasTransparency) {
      // Redraw with background
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height;
      const newCtx = newCanvas.getContext('2d');
      newCtx.fillStyle = background;
      newCtx.fillRect(0, 0, canvas.width, canvas.height);
      newCtx.drawImage(canvas, 0, 0);
      canvas = newCanvas;
    }
  }
  
  return canvasToBlob(canvas, mimeType, quality);
}

/**
 * Compress image with quality control
 * @param {File|Blob} file - Source image
 * @param {Object} options - Compression options
 * @param {number} [options.targetSize] - Target size in bytes
 * @param {number} [options.maxDimension] - Maximum dimension
 * @param {number} [options.minQuality=0.1] - Minimum quality
 * @param {number} [options.maxQuality=0.95] - Maximum quality
 * @param {number} [options.step=0.05] - Quality step for binary search
 * @returns {Promise<{blob: Blob, quality: number, size: number}>} Compressed result
 */
export async function compressImage(file, options = {}) {
  const {
    targetSize,
    maxDimension,
    minQuality = 0.1,
    maxQuality = 0.95,
    step = 0.05
  } = options;
  
  const img = await loadImage(file);
  let { width, height } = img;
  
  // Apply max dimension constraint
  if (maxDimension && (width > maxDimension || height > maxDimension)) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  
  // Determine format
  const isJPEG = file.type === 'image/jpeg' || file.type === 'image/jpg';
  const format = isJPEG ? 'image/jpeg' : (file.type === 'image/png' ? 'image/png' : 'image/webp');
  
  if (!targetSize) {
    // Simple compression with max quality
    const canvas = resizeImage(img, { width, height });
    const blob = await canvasToBlob(canvas, format, maxQuality);
    return { blob, quality: maxQuality, size: blob.size };
  }
  
  // Binary search for optimal quality
  let low = minQuality;
  let high = maxQuality;
  let bestBlob = null;
  let bestQuality = maxQuality;
  
  // First, try max quality
  let canvas = resizeImage(img, { width, height });
  let blob = await canvasToBlob(canvas, format, high);
  
  if (blob.size <= targetSize) {
    return { blob, quality: high, size: blob.size };
  }
  
  // Try min quality
  blob = await canvasToBlob(canvas, format, low);
  if (blob.size > targetSize) {
    // Even at min quality, too large - need to resize
    return { blob, quality: low, size: blob.size };
  }
  
  // Binary search
  while (high - low > step) {
    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, format, mid);
    
    if (blob.size <= targetSize) {
      low = mid;
      bestBlob = blob;
      bestQuality = mid;
    } else {
      high = mid;
    }
  }
  
  return { blob: bestBlob || blob, quality: bestQuality, size: bestBlob?.size || blob.size };
}

/**
 * Convert multiple images to PDF
 * @param {File[]} files - Image files
 * @param {Object} options - PDF options
 * @param {string} [options.pageSize='A4'] - Page size: 'A4', 'Letter', 'Legal', or 'auto'
 * @param {string} [options.orientation='portrait'] - Page orientation
 * @param {number} [options.margin=0] - Margin in points
 * @param {boolean} [options.fitToPage=true] - Fit image to page
 * @returns {Promise<Blob>} PDF blob
 */
export async function imagesToPDF(files, options = {}) {
  const { pageSize = 'A4', orientation = 'portrait', margin = 0, fitToPage = true } = options;
  const PDFLib = (await import('pdf-lib')).default;
  
  const pdfDoc = await PDFLib.PDFDocument.create();
  
  // Page dimensions in points (1 pt = 1/72 inch)
  const pageSizes = {
    A4: { width: 595.28, height: 841.89 },
    Letter: { width: 612, height: 792 },
    Legal: { width: 612, height: 1008 },
    A3: { width: 841.89, height: 1190.55 },
    A5: { width: 419.53, height: 595.28 }
  };
  
  let pageWidth = pageSizes[pageSize]?.width || pageSizes.A4.width;
  let pageHeight = pageSizes[pageSize]?.height || pageSizes.A4.height;
  
  if (orientation === 'landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }
  
  for (const file of files) {
    const img = await loadImage(file);
    const { width: imgWidth, height: imgHeight } = img;
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    if (fitToPage) {
      // Calculate scale to fit
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;
      const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
      
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;
      
      // Embed image
      let pdfImage;
      if (file.type === 'image/png') {
        pdfImage = await pdfDoc.embedPng(await readFileAsArrayBuffer(file));
      } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        pdfImage = await pdfDoc.embedJpg(await readFileAsArrayBuffer(file));
      } else {
        // Convert to PNG first
        const pngBlob = await convertImage(file, { format: 'png' });
        pdfImage = await pdfDoc.embedPng(await readFileAsArrayBuffer(pngBlob));
      }
      
      page.drawImage(pdfImage, { x, y, width: drawWidth, height: drawHeight });
    } else {
      // Actual size (1 pixel = 1 point)
      let pdfImage;
      if (file.type === 'image/png') {
        pdfImage = await pdfDoc.embedPng(await readFileAsArrayBuffer(file));
      } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        pdfImage = await pdfDoc.embedJpg(await readFileAsArrayBuffer(file));
      } else {
        const pngBlob = await convertImage(file, { format: 'png' });
        pdfImage = await pdfDoc.embedPng(await readFileAsArrayBuffer(pngBlob));
      }
      
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      page.drawImage(pdfImage, { x, y, width: imgWidth, height: imgHeight });
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Create thumbnail from image
 * @param {File|Blob} file - Source image
 * @param {Object} options - Thumbnail options
 * @param {number} [options.size=128] - Thumbnail size (square)
 * @param {string} [options.format='jpeg'] - Output format
 * @param {number} [options.quality=0.8] - Quality
 * @returns {Promise<Blob>} Thumbnail blob
 */
export async function createThumbnail(file, options = {}) {
  const { size = 128, format = 'jpeg', quality = 0.8 } = options;
  const img = await loadImage(file);
  const canvas = resizeImage(img, { width: size, height: size, fit: 'cover' });
  return canvasToBlob(canvas, `image/${format}`, quality);
}

/**
 * Extract frames from animated image (GIF, WebP)
 * @param {File|Blob} file - Animated image
 * @returns {Promise<Blob[]>} Array of frame blobs
 */
export async function extractFrames(file) {
  // This is a simplified version - full implementation would need
  // a GIF/WebP parser. For now, return the original as single frame.
  return [file];
}

/**
 * Apply image filter/effect
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {string} filter - CSS filter string
 * @returns {HTMLCanvasElement} Filtered canvas
 */
export function applyFilter(canvas, filter) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create a temporary canvas to apply filter
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.filter = filter;
  tempCtx.drawImage(canvas, 0, 0);
  
  return tempCanvas;
}

/**
 * Rotate image by degrees
 * @param {HTMLImageElement|HTMLCanvasElement} source - Source image
 * @param {number} degrees - Rotation degrees (90, 180, 270)
 * @returns {HTMLCanvasElement} Rotated canvas
 */
export function rotateImage(source, degrees) {
  const srcWidth = source.naturalWidth || source.width;
  const srcHeight = source.naturalHeight || source.height;
  
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const is90or270 = normalizedDegrees === 90 || normalizedDegrees === 270;
  
  const canvas = document.createElement('canvas');
  canvas.width = is90or270 ? srcHeight : srcWidth;
  canvas.height = is90or270 ? srcWidth : srcHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(normalizedDegrees * Math.PI / 180);
  ctx.drawImage(source, -srcWidth / 2, -srcHeight / 2);
  
  return canvas;
}

/**
 * Flip image horizontally or vertically
 * @param {HTMLImageElement|HTMLCanvasElement} source - Source image
 * @param {boolean} horizontal - Flip horizontally
 * @param {boolean} vertical - Flip vertically
 * @returns {HTMLCanvasElement} Flipped canvas
 */
export function flipImage(source, horizontal = false, vertical = false) {
  const srcWidth = source.naturalWidth || source.width;
  const srcHeight = source.naturalHeight || source.height;
  
  const canvas = document.createElement('canvas');
  canvas.width = srcWidth;
  canvas.height = srcHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.translate(srcWidth / 2, srcHeight / 2);
  ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
  ctx.drawImage(source, -srcWidth / 2, -srcHeight / 2);
  
  return canvas;
}

/**
 * Crop image
 * @param {HTMLImageElement|HTMLCanvasElement} source - Source image
 * @param {Object} rect - Crop rectangle {x, y, width, height}
 * @returns {HTMLCanvasElement} Cropped canvas
 */
export function cropImage(source, rect) {
  const { x, y, width, height } = rect;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return canvas;
}

/**
 * Merge multiple images horizontally or vertically
 * @param {File[]} files - Image files
 * @param {Object} options - Merge options
 * @param {string} [options.direction='horizontal'] - 'horizontal' or 'vertical'
 * @param {string} [options.background='#ffffff'] - Background color
 * @param {number} [options.spacing=0] - Spacing between images
 * @returns {Promise<Blob>} Merged image blob
 */
export async function mergeImages(files, options = {}) {
  const { direction = 'horizontal', background = '#ffffff', spacing = 0 } = options;
  
  const images = await Promise.all(files.map(loadImage));
  
  let totalWidth = 0;
  let totalHeight = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  
  if (direction === 'horizontal') {
    totalWidth = images.reduce((sum, img) => sum + (img.naturalWidth || img.width), 0) + spacing * (images.length - 1);
    maxHeight = Math.max(...images.map(img => img.naturalHeight || img.height));
  } else {
    totalHeight = images.reduce((sum, img) => sum + (img.naturalHeight || img.height), 0) + spacing * (images.length - 1);
    maxWidth = Math.max(...images.map(img => img.naturalWidth || img.width));
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = direction === 'horizontal' ? totalWidth : maxWidth;
  canvas.height = direction === 'vertical' ? totalHeight : maxHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  let offset = 0;
  for (const img of images) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    
    if (direction === 'horizontal') {
      ctx.drawImage(img, offset, (canvas.height - h) / 2);
      offset += w + spacing;
    } else {
      ctx.drawImage(img, (canvas.width - w) / 2, offset);
      offset += h + spacing;
    }
  }
  
  return canvasToBlob(canvas, 'image/png', 1.0);
}

/**
 * Estimate image file size after compression
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} format - Output format
 * @param {number} quality - Quality (0-1)
 * @returns {number} Estimated size in bytes
 */
export function estimateImageSize(width, height, format, quality) {
  const pixels = width * height;
  const bytesPerPixel = format === 'png' ? 4 : (format === 'webp' ? 3 : 3);
  const baseSize = pixels * bytesPerPixel;
  const compressionRatio = format === 'png' ? 0.7 : (format === 'webp' ? 0.3 * quality : 0.15 * quality);
  return Math.round(baseSize * compressionRatio);
}

/**
 * Check if browser supports image format
 * @param {string} format - Format to check ('webp', 'avif', 'jpeg', 'png')
 * @returns {Promise<boolean>} True if supported
 */
export async function isFormatSupported(format) {
  const testData = {
    webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
    avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=',
    jpeg: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//Z',
    png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  };
  
  if (!testData[format]) return true; // Assume supported if unknown
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = testData[format];
  });
}