import { isPremiumUser, FREE_MAX_IMAGE_SIZE_MB, PREMIUM_MAX_FILE_SIZE_MB } from './premiumHelper';

/**
 * Tự động nén ảnh nếu dung lượng lớn hơn 1.5 MB hoặc kích thước vượt quá 2500px.
 * Giảm kích thước chiều lớn nhất xuống tối đa 2200px và xuất JPEG/WebP chất lượng 0.8.
 * @param {File} file - File ảnh gốc đầu vào
 * @returns {Promise<File>} File ảnh mới (được nén nếu cần)
 */
export const compressImageIfNeeded = async (file) => {
  // Chỉ nén ảnh (jpeg, png, webp, v.v.), không nén PDF trực tiếp ở đây
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // 1. Giới hạn dung lượng tệp tin thô của ảnh đầu vào theo Gói tài khoản
  const isPremium = isPremiumUser();
  const maxRawImageSize = (isPremium ? PREMIUM_MAX_FILE_SIZE_MB : FREE_MAX_IMAGE_SIZE_MB) * 1024 * 1024;
  if (file.size > maxRawImageSize) {
    throw new Error(`File quá lớn. Kích thước tối đa cho phép là ${isPremium ? PREMIUM_MAX_FILE_SIZE_MB : FREE_MAX_IMAGE_SIZE_MB}MB.`);
  }

  const SIZE_LIMIT = 1.5 * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      // Giải phóng URL đối tượng ngay khi ảnh đã được tải vào thẻ Image
      URL.revokeObjectURL(objectUrl);

      const width = img.width;
      const height = img.height;
      
      // 2. Kiểm tra độ phân giải quá lớn để tránh làm sập canvas / bộ nhớ trình duyệt
      if (width > 8000 || height > 8000) {
        reject(new Error("File quá lớn hoặc ảnh có độ phân giải quá cao. Vui lòng nén file hoặc thử file nhỏ hơn."));
        return;
      }

      // Chỉ thực hiện nén nếu dung lượng lớn hơn 1.5MB hoặc kích thước lớn hơn 2500px
      const needsCompression = file.size > SIZE_LIMIT || width > 2500 || height > 2500;
      if (!needsCompression) {
        resolve(file);
        return;
      }

      // Tính toán kích thước mới duy trì tỷ lệ khung hình (aspect ratio)
      let newWidth = width;
      let newHeight = height;
      const MAX_DIM = 2200;

      if (newWidth > MAX_DIM || newHeight > MAX_DIM) {
        if (newWidth > newHeight) {
          newHeight = Math.round((newHeight * MAX_DIM) / newWidth);
          newWidth = MAX_DIM;
        } else {
          newWidth = Math.round((newWidth * MAX_DIM) / newHeight);
          newHeight = MAX_DIM;
        }
      }

      // Tạo canvas tạm thời để vẽ lại ảnh
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      const suffix = file.type === 'image/webp' ? '_compressed.webp' : '_compressed.jpg';

      // Xuất sang Blob với chất lượng nén 0.8
      canvas.toBlob((blob) => {
        // Giải phóng tài nguyên canvas lập tức để tránh rò rỉ GPU/bộ nhớ
        canvas.width = 0;
        canvas.height = 0;

        if (!blob) {
          reject(new Error("Lỗi khi nén ảnh: không tạo được Blob."));
          return;
        }

        // Tạo đối tượng File mới
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + suffix;
        const compressedFile = new File([blob], newFileName, { 
          type: outputType,
          lastModified: Date.now()
        });

        resolve(compressedFile);
      }, outputType, 0.8);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Lỗi khi nén: không thể tải ảnh gốc vào bộ nhớ."));
    };

    img.src = objectUrl;
  });
};
