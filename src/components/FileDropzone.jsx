import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

export default function FileDropzone({ onFilesSelected }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList) => {
    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(file => 
      file.type === 'image/jpeg' || 
      file.type === 'image/png' || 
      file.type === 'application/pdf'
    );
    
    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles);
    } else {
      alert("Vui lòng chỉ chọn file .jpg, .png hoặc .pdf");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <label
      className={`w-full p-8 border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer min-h-[220px] rounded-[24px] shadow-[0_0_2px_0_rgba(0,0,0,0.15),_0_8px_40px_0_rgba(0,0,0,0.04),_0_2px_5px_0_rgba(0,0,0,0.05)] ${
        isDragActive 
          ? 'border-[#ffdd00] bg-[#ffdd00]/10 shadow-inner scale-[1.01]' 
          : 'border-slate-300 bg-[#ffffff] hover:border-[#ffdd00] hover:bg-slate-50/20'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`p-4 rounded-full mb-3 transition-colors ${
        isDragActive ? 'bg-[#ffdd00]/20 text-[#222222]' : 'bg-slate-50 text-[#717171] border border-slate-200'
      }`}>
        <UploadCloud size={36} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-extrabold text-[#222222] mb-1">
        {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file của bạn vào đây'}
      </h3>
      <p className="text-[#717171] text-center text-xs font-semibold leading-relaxed">
        Hoặc click để duyệt file từ máy tính của bạn<br/>
        <span className="text-[10px] text-slate-400 mt-1 block font-bold">Hỗ trợ các định dạng: JPG, PNG, PDF</span>
      </p>

      {/* Đặt thẻ input nằm trong label để xử lý click tự nhiên của trình duyệt, không cần JS click() tránh loop */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".jpg,.jpeg,.png,.pdf"
        multiple
        className="hidden"
      />
    </label>
  );
}
