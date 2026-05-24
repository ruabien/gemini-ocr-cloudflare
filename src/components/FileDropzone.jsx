import { useState, useRef } from 'react';

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
      className={`relative block w-full bg-surface-container-lowest border-2 border-dashed rounded-xl p-10 transition-all duration-300 cursor-pointer group shadow-[0_4px_20px_rgba(0,88,190,0.04)] select-none text-center ${
        isDragActive 
          ? 'border-primary bg-primary-container/10 scale-[1.01]' 
          : 'border-primary/40 hover:border-primary hover:bg-primary-container/5'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Scanner Animation */}
      {isDragActive && (
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div className="scanning-line"></div>
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <span className="material-icons text-4xl">cloud_upload</span>
        </div>
        <div className="space-y-1">
          <p className="font-headline-md text-headline-md text-on-surface">
            {isDragActive ? 'Thả file vào đây...' : 'Kéo thả hoặc chạm để chọn file'}
          </p>
          <p className="text-label-md text-on-surface-variant font-medium">(PDF, JPG, PNG)</p>
        </div>
      </div>

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

