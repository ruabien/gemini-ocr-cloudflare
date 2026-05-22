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
      className={`w-full p-6 sm:p-10 border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 cursor-pointer min-h-[180px] sm:min-h-[220px] rounded-[24px] shadow-[0_4px_20px_rgba(0,88,190,0.04)] ${
        isDragActive 
          ? 'border-[#0058be] bg-[#2170e4]/5 scale-[1.01]' 
          : 'border-[#0058be]/40 bg-white hover:border-[#0058be] hover:bg-slate-50/50'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="w-16 h-16 rounded-full bg-[#0058be]/10 flex items-center justify-center text-[#0058be] mb-4 transition-transform group-hover:scale-110">
        <UploadCloud size={36} strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg md:text-xl font-bold text-[#0b1c30] text-center mb-1 select-none">
        {isDragActive ? 'Thả file vào đây...' : 'Kéo thả hoặc chạm để chọn file'}
      </h3>
      <p className="font-sans text-sm font-bold text-[#424754] text-center select-none">
        (PDF, JPG, PNG)
      </p>

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
