import { onRequestPost } from '../functions/api/ocr/export/docx';

async function runTest() {
  const mockText = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nBẢN ÁN HÌNH SỰ SƠ THẨM\nVề việc xét xử vụ án trộm cắp tài sản.";
  const mockFileName = "ban_an.txt";

  const mockRequest = {
    json: async () => ({ text: mockText, fileName: mockFileName })
  };

  try {
    const response = await onRequestPost({ request: mockRequest as any });
    console.log("Response status:", response.status);
    console.log("Headers content-type:", response.headers.get("Content-Type"));
    console.log("Headers content-disposition:", response.headers.get("Content-Disposition"));

    const body = await response.arrayBuffer();
    console.log("Buffer byte length:", body.byteLength);

    if (response.status === 200 && body.byteLength > 0) {
      console.log("TEST SUCCESSFUL");
      process.exit(0);
    } else {
      console.error("TEST FAILED");
      process.exit(1);
    }
  } catch (error) {
    console.error("TEST EXCEPTION:", error);
    process.exit(1);
  }
}

runTest();