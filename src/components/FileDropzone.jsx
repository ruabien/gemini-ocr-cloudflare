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
      className={`w-full p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer min-h-[300px] ${
        isDragActive 
          ? 'border-indigo-500 bg-indigo-50/50 shadow-inner scale-[1.01]' 
          : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/40'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`p-4 rounded-full mb-4 transition-colors ${
        isDragActive ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-100 text-slate-500 border border-slate-200'
      }`}>
        <UploadCloud size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file của bạn vào đây'}
      </h3>
      <p className="text-slate-600 text-center text-sm">
        Hoặc click để duyệt file từ máy tính của bạn<br/>
        <span className="text-xs text-slate-400 mt-2 block font-medium">Hỗ trợ các định dạng: JPG, PNG, PDF</span>
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
