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
      className={`w-full p-8 border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer min-h-[220px] rounded-xl shadow-sm ${
        isDragActive 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
          : 'border-slate-300 bg-white hover:border-indigo-500 hover:bg-slate-50/30'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`p-4 rounded-xl mb-3 transition-colors border ${
        isDragActive 
          ? 'bg-indigo-100 text-indigo-600 border-indigo-200' 
          : 'bg-slate-50 text-slate-600 border-slate-200/80'
      }`}>
        <UploadCloud size={36} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file của bạn vào đây'}
      </h3>
      <p className="text-slate-700 text-center text-[15px] font-semibold leading-relaxed">
        Hoặc click để duyệt file từ máy tính của bạn<br/>
        <span className="text-[12px] text-slate-400 mt-1 block font-bold">Hỗ trợ các định dạng: JPG, PNG, PDF</span>
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
