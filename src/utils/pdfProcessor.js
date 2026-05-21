/**
 * Hàm tải động thư viện PDF.js từ CDN và cấu hình Worker
 */
export const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      // Thiết lập Worker URL từ CDN tương ứng để xử lý giải nén/render ngầm
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => {
      reject(new Error('Không thể tải thư viện PDF.js từ CDN. Vui lòng kiểm tra lại kết nối mạng.'));
    };
    document.head.appendChild(script);
  });
};

/**
 * Bóc tách tệp PDF thành danh sách các tệp ảnh JPEG độc lập ngay trên trình duyệt
 * @param {File} pdfFile - Đối tượng File PDF
 * @param {Function} onProgress - Callback báo cáo tiến trình (currentPage, totalPages)
 * @returns {Promise<File[]>} Mảng các đối tượng File ảnh JPEG tương ứng từng trang
 */
export const splitPdfToImages = async (pdfFile, onProgress) => {
  const pdfjsLib = await loadPdfJs();
  
  // Đọc file thành ArrayBuffer để PDF.js xử lý trực tiếp trên trình duyệt
  const arrayBuffer = await pdfFile.arrayBuffer();
  
  // Nạp tài liệu PDF
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const imageFiles = [];

  const baseName = pdfFile.name.replace(/\.[^/.]+$/, "");

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(i, numPages);
    }

    const page = await pdf.getPage(i);
    
    // Sử dụng tỉ lệ scale = 2.0 để ảnh xuất ra có độ nét cao, hỗ trợ OCR tốt hơn
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Tạo canvas tạm thời để vẽ trang PDF lên đó
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    // Tiến hành render trang PDF lên canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Chuyển nội dung canvas thành Blob định dạng jpeg
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9); // Chất lượng 90%
    });

    // Tạo đối tượng File từ Blob vừa render
    const pageFile = new File([blob], `${baseName}_Trang_${i}.jpg`, { type: 'image/jpeg' });
    imageFiles.push(pageFile);
  }

  return imageFiles;
};
