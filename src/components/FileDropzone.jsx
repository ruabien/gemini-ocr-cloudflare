import { useState, useRef } from 'react';

export default function FileDropzone({ onFilesSelected, isCompact = false }) {
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
      const droppedFiles = e.dataTransfer.files;
      // Dùng setTimeout giải phóng luồng chính lập tức
      setTimeout(() => {
        handleFiles(droppedFiles);
      }, 0);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = e.target.files;
      // Dùng setTimeout để hộp thoại đóng ngay lập tức, không gây treo luồng vẽ chính
      setTimeout(() => {
        handleFiles(selectedFiles);
      }, 0);
    }
  };

  const handleFiles = (fileList) => {
    const filesArray = Array.from(fileList);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const rejectedFiles = [];
    
    const validFiles = filesArray.filter(file => {
      const type = file.type || '';
      const name = (file.name || '').toLowerCase();
      const isFormatValid = (
        type === 'image/jpeg' || 
        type === 'image/png' || 
        type === 'image/webp' ||
        type === 'application/pdf' ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        name.endsWith('.pdf')
      );
      
      if (!isFormatValid) {
        rejectedFiles.push({ name: file.name, reason: "Định dạng không hỗ trợ" });
        return false;
      }
      
      if (file.size > MAX_SIZE) {
        rejectedFiles.push({ name: file.name, reason: "Kích thước vượt quá 100MB" });
        return false;
      }
      
      return true;
    });
    
    if (rejectedFiles.length > 0) {
      const errorList = rejectedFiles.map(f => `- ${f.name}: ${f.reason}`).join('\n');
      alert(`Một số tệp bị từ chối:\n${errorList}`);
    }
    
    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (isCompact) {
    return (
      <label
        className={`relative block w-full bg-slate-50 border border-dashed rounded-2xl p-4 transition-all duration-300 cursor-pointer group select-none text-center ${
          isDragActive 
            ? 'border-primary bg-primary/5 scale-[1.01]' 
            : 'border-slate-200 hover:border-primary hover:bg-slate-100/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragActive && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="scanning-line"></div>
          </div>
        )}
        
        <div className="flex items-center justify-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
            <span className="material-icons text-[20px]">cloud_upload</span>
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">
              {isDragActive ? 'Thả file vào đây...' : 'Kéo thả hoặc chạm để thêm tài liệu'}
            </p>
            <p className="text-[10px] text-on-surface-variant/80 font-medium">PDF, JPG, PNG, WEBP tối đa 100MB</p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept=".pdf, .jpg, .jpeg, .png, .webp"
          multiple
          id="compact-file-input"
          className="hidden"
        />
      </label>
    );
  }

  return (
    <label
      className={`relative block w-full bg-white border-2 border-dashed rounded-3xl p-10 md:p-12 transition-all duration-300 cursor-pointer group shadow-[0_4px_30px_rgba(37,99,235,0.02)] select-none text-center ${
        isDragActive 
          ? 'border-primary bg-primary/5 scale-[1.01]' 
          : 'border-slate-250 hover:border-primary hover:bg-slate-50/50'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Scanner Animation */}
      {isDragActive && (
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="scanning-line"></div>
        </div>
      )}
      
      <div className="flex flex-col items-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/10 to-ai-accent/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all duration-300 border border-slate-100 shadow-sm">
          <span className="material-icons text-[32px] bg-gradient-to-tr from-primary to-ai-accent bg-clip-text text-transparent">cloud_upload</span>
        </div>
        <div className="space-y-2">
          <p className="font-bold text-lg sm:text-xl text-on-surface leading-tight">
            {isDragActive ? 'Thả file của bạn để bắt đầu...' : 'Kéo thả hoặc chạm để tải file lên'}
          </p>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium max-w-sm mx-auto leading-relaxed">
            Hỗ trợ hình ảnh chụp tài liệu dạng JPG, PNG, WEBP hoặc tệp văn bản PDF scan nhiều trang
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500">
          <span>Giới hạn file: 100 MB</span>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".pdf, .jpg, .jpeg, .png, .webp"
        multiple
        id="hero-file-input"
        className="hidden"
      />
    </label>
  );
}

