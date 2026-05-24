/**
 * Tự động nén ảnh nếu dung lượng lớn hơn 1.5 MB
 * Giảm kích thước chiều lớn nhất xuống tối đa 1600px và xuất JPEG chất lượng 0.8
 * @param {File} file - File ảnh gốc đầu vào
 * @returns {Promise<File>} File ảnh mới (được nén nếu cần)
 */
export const compressImageIfNeeded = async (file) => {
  // Chỉ nén ảnh (jpeg, png, webp, v.v.), không nén PDF trực tiếp ở đây
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Giới hạn 1.5 MB = 1.5 * 1024 * 1024 bytes
  const LIMIT = 1.5 * 1024 * 1024;
  if (file.size <= LIMIT) {
    return file;
  }

  console.log(`Tiến hành nén ảnh: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tính toán kích thước mới duy trì tỷ lệ khung hình (aspect ratio)
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1600;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        // Tạo canvas tạm thời để vẽ lại ảnh
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất sang Blob JPEG với chất lượng nén 0.8
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Lỗi khi nén ảnh: không tạo được Blob."));
            return;
          }

          // Tạo đối tượng File mới có đuôi _compressed.jpg
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg";
          const compressedFile = new File([blob], newFileName, { 
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          console.log(`Đã nén xong: ${compressedFile.name} (${(compressedFile.size / 1024).toFixed(2)} KB)`);
          resolve(compressedFile);
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => {
        reject(new Error("Lỗi khi nén: không thể tải ảnh gốc vào bộ nhớ."));
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error("Lỗi khi đọc file bằng FileReader."));
    };
    reader.readAsDataURL(file);
  });
};
