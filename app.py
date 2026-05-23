import os
import io
import re
import numpy as np
import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from paddleocr import PaddleOCR

# ----------------------------------------------------
# 1. KHỞI TẠO MÔ HÌNH & THIẾT BỊ
# ----------------------------------------------------
# Kiểm tra GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[*] Đang sử dụng thiết bị: {device}")

# Khởi tạo PaddleOCR (Tự động tải model tiếng Việt)
print("[*] Đang tải mô hình PaddleOCR...")
ocr = PaddleOCR(use_angle_cls=True, lang='vi', use_gpu=torch.cuda.is_available(), show_log=False)

# Khởi tạo mô hình sửa lỗi chính tả văn bản pháp lý ProtonX
print("[*] Đang tải mô hình sửa lỗi ProtonX (nano-protonx-legal-tc)...")
model_path = "protonx-models/nano-protonx-legal-tc"
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForSeq2SeqLM.from_pretrained(model_path).to(device)
model.eval()

print("[*] Hoàn tất khởi tạo hệ thống!")

# ----------------------------------------------------
# 2. HÀM HỖ TRỢ XỬ LÝ VĂN BẢN
# ----------------------------------------------------
def correct_segment(segment: str) -> str:
    """Sử dụng mô hình ProtonX để sửa lỗi một đoạn văn bản ngắn (< 160 tokens)"""
    if not segment.strip():
        return ""
    try:
        inputs = tokenizer(
            segment, 
            return_tensors="pt", 
            truncation=True, 
            max_length=160
        ).to(device)
        
        with torch.no_grad():
            outputs = model.generate(**inputs, max_length=160)
            
        corrected = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return corrected
    except Exception as e:
        print(f"[!] Lỗi khi sửa lỗi đoạn văn bản: {e}")
        return segment

def correct_text(raw_text: str) -> str:
    """Chia văn bản thành từng dòng, và chia nhỏ dòng dài nếu cần thiết để sửa lỗi chính xác"""
    if not raw_text.strip():
        return ""
        
    lines = raw_text.split("\n")
    corrected_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            corrected_lines.append("")
            continue
            
        words = line.split()
        # Chia nhỏ dòng nếu nó dài hơn 25 từ (để khớp với giới hạn 160 tokens)
        if len(words) <= 25:
            corrected_lines.append(correct_segment(line))
        else:
            chunks = []
            chunk_size = 25
            for i in range(0, len(words), chunk_size):
                chunks.append(" ".join(words[i:i+chunk_size]))
                
            corrected_chunks = [correct_segment(c) for c in chunks]
            corrected_lines.append(" ".join(corrected_chunks))
            
    return "\n".join(corrected_lines)

# ----------------------------------------------------
# 3. THIẾT LẬP FASTAPI BACKEND
# ----------------------------------------------------
app = FastAPI(
    title="Smart OCR Router Open-Source Backend",
    description="API bóc tách chữ tiếng Việt bằng PaddleOCR và sửa lỗi bằng nano-protonx-legal-tc"
)

# Cấu hình CORS để cho phép Frontend React gọi trực tiếp
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ocr")
async def run_ocr_endpoint(file: UploadFile = File(...)):
    """API endpoint xử lý OCR cho file hình ảnh"""
    try:
        # 1. Đọc file hình ảnh
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Tệp gửi lên không phải là ảnh hợp lệ: {str(e)}")
        
    # Chuyển đổi sang numpy array để sử dụng trong PaddleOCR
    img_np = np.array(image)
    
    # 2. Chạy PaddleOCR
    try:
        ocr_result = ocr.ocr(img_np, cls=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi chạy PaddleOCR: {str(e)}")
        
    # Trích xuất toàn bộ text thô theo dòng
    if not ocr_result or not ocr_result[0]:
        return {
            "text": "",
            "raw_text": ""
        }
        
    lines = []
    for line in ocr_result[0]:
        # line[1][0] là chuỗi text nhận diện được
        lines.append(line[1][0])
        
    raw_text = "\n".join(lines)
    
    # 3. Sửa lỗi chính tả bằng nano-protonx-legal-tc
    try:
        corrected_text = correct_text(raw_text)
    except Exception as e:
        print(f"[!] Lỗi khi chạy mô hình sửa lỗi: {e}")
        corrected_text = raw_text  # Fallback về text thô nếu mô hình lỗi
        
    return {
        "text": corrected_text,
        "raw_text": raw_text
    }

# ----------------------------------------------------
# 4. THIẾT LẬP GRADIO UI PLAYGROUND
# ----------------------------------------------------
def gradio_process(img):
    if img is None:
        return "Vui lòng chọn ảnh", "Vui lòng chọn ảnh"
    
    img_np = np.array(img)
    ocr_result = ocr.ocr(img_np, cls=True)
    
    if not ocr_result or not ocr_result[0]:
        return "Không tìm thấy ký tự nào trong ảnh.", "Không tìm thấy ký tự nào trong ảnh."
        
    lines = [line[1][0] for line in ocr_result[0]]
    raw_text = "\n".join(lines)
    
    corrected_text = correct_text(raw_text)
    return raw_text, corrected_text

demo = gr.Interface(
    fn=gradio_process,
    inputs=gr.Image(type="pil", label="Chọn ảnh tài liệu cần OCR"),
    outputs=[
        gr.Textbox(label="Văn bản gốc bóc thô (PaddleOCR)", show_copy_button=True),
        gr.Textbox(label="Văn bản sạch đã sửa lỗi (ProtonX)", show_copy_button=True)
    ],
    title="PaddleOCR + ProtonX Legal TC Playground",
    description="Tải lên ảnh tài liệu tiếng Việt để trải nghiệm tốc độ của PaddleOCR kết hợp với khả năng chuẩn hóa chính tả của mô hình nano-protonx-legal-tc.",
    theme="soft"
)

# Mount Gradio UI vào FastAPI ở đường dẫn gốc /
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Space mặc định sẽ chạy trên cổng 7860
    uvicorn.run(app, host="0.0.0.0", port=7860)
