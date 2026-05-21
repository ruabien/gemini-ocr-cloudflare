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
      className={`w-full p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer min-h-[300px] ${
        isDragActive 
          ? 'border-emerald-500 bg-slate-800/40 shadow-inner scale-[1.01]' 
          : 'border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 hover:bg-slate-900/80'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`p-4 rounded-full mb-4 transition-colors ${
        isDragActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/80 text-slate-400 border border-slate-800/60'
      }`}>
        <UploadCloud size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-slate-200 mb-2">
        {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file của bạn vào đây'}
      </h3>
      <p className="text-slate-400 text-center text-sm">
        Hoặc click để duyệt file từ máy tính của bạn<br/>
        <span className="text-xs text-slate-500 mt-2 block font-medium">Hỗ trợ các định dạng: JPG, PNG, PDF</span>
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
