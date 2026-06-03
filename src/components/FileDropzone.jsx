import { useState, useRef } from 'react';
import { isPremiumUser, FREE_MAX_IMAGE_SIZE_MB, FREE_MAX_PDF_SIZE_MB, PREMIUM_MAX_FILE_SIZE_MB } from '../utils/premiumHelper';

export default function FileDropzone({ onFilesSelected, isCompact = false, disabled = false }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = e.dataTransfer.files;
      setTimeout(() => {
        handleFiles(droppedFiles);
      }, 0);
    }
  };

  const handleChange = (e) => {
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = e.target.files;
      setTimeout(() => {
        handleFiles(selectedFiles);
      }, 0);
    }
  };

  const handleFiles = (fileList) => {
    if (disabled) return;
    const filesArray = Array.from(fileList);
    const rejectedFiles = [];
    
    const validFiles = filesArray.filter(file => {
      const type = file.type || '';
      const name = (file.name || '').toLowerCase();
      const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
      
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
        rejectedFiles.push({ name: file.name, reason: "Định dạng không hỗ trợ (Chỉ nhận PDF, JPG, PNG, WEBP)" });
        return false;
      }

      const isPremium = isPremiumUser();
      let limitBytes;
      let reasonMessage;
      
      if (isPremium) {
        limitBytes = PREMIUM_MAX_FILE_SIZE_MB * 1024 * 1024;
        reasonMessage = `File vượt giới hạn ${PREMIUM_MAX_FILE_SIZE_MB}MB của gói Premium.`;
      } else {
        const freeLimitMb = isPdf ? FREE_MAX_PDF_SIZE_MB : FREE_MAX_IMAGE_SIZE_MB;
        limitBytes = freeLimitMb * 1024 * 1024;
        reasonMessage = `File vượt giới hạn gói miễn phí. Nâng cấp Premium để xử lý file lên tới 50MB.`;
      }
      
      if (file.size > limitBytes) {
        rejectedFiles.push({ name: file.name, reason: reasonMessage });
        return false;
      }
      
      return true;
    });
    
    if (rejectedFiles.length > 0) {
      const errorList = rejectedFiles.map(f => `- ${f.name}: ${f.reason}`).join('\n');
      alert(`Một số tệp không hợp lệ:\n${errorList}`);
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
      <>
        <label
          htmlFor={disabled ? undefined : "compact-file-input"}
          className={`relative block w-full bg-background border border-dashed rounded-2xl p-4 transition-all duration-300 group select-none text-center ${
            disabled 
              ? 'opacity-40 border-border bg-background cursor-not-allowed'
              : isDragActive 
                ? 'border-primary bg-primary/5 scale-[1.01] cursor-pointer' 
                : 'border-border hover:border-primary hover:bg-surface cursor-pointer'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragActive && !disabled && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="scanning-line"></div>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
              <span className="material-icons text-[20px]">cloud_upload</span>
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">
                {disabled 
                  ? 'Đang xử lý OCR, vui lòng đợi...' 
                  : isDragActive 
                    ? 'Thả file vào đây...' 
                    : 'Kéo thả hoặc chạm để thêm tài liệu'}
              </p>
              <p className="text-[10px] text-text-secondary/80 font-medium">{isPremiumUser() ? 'Premium: Tối đa 50MB' : 'Ảnh tối đa 10MB, PDF tối đa 20MB'}</p>
            </div>
          </div>
        </label>

        {!disabled && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            multiple
            id="compact-file-input"
            className="hidden"
            disabled={disabled}
          />
        )}
      </>
    );
  }

  return (
    <>
      <label
        htmlFor={disabled ? undefined : "hero-file-input"}
        className={`relative block w-full bg-surface border-2 border-dashed rounded-2xl p-10 md:p-12 transition-all duration-300 group shadow-[0_4px_24px_rgba(22,58,112,0.03)] select-none text-center ${
          disabled 
            ? 'opacity-40 border-border bg-background cursor-not-allowed'
            : isDragActive 
              ? 'border-primary bg-primary/5 scale-[1.01] cursor-pointer' 
              : 'border-border hover:border-primary hover:bg-background/50 cursor-pointer'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragActive && !disabled && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="scanning-line"></div>
          </div>
        )}
        
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-all duration-300 border border-border/50 shadow-xs">
            <span className="material-icons text-[32px] text-primary">cloud_upload</span>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-lg sm:text-xl text-text-primary leading-tight">
              {disabled 
                ? 'Đang xử lý OCR, vui lòng đợi...' 
                : isDragActive 
                  ? 'Thả file của bạn để bắt đầu...' 
                  : 'Kéo thả hoặc chạm để tải file lên'}
            </p>
            <p className="text-xs sm:text-sm text-text-secondary font-medium max-w-sm mx-auto leading-relaxed">
              Hỗ trợ hình ảnh chụp tài liệu và tệp PDF scan ({isPremiumUser() ? 'Premium: tối đa 50MB' : 'Ảnh tối đa 10MB | PDF tối đa 20MB'})
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-background border border-border rounded-lg text-xs font-semibold text-text-secondary">
            <span>Giới hạn: {isPremiumUser() ? 'Tối đa 50MB' : 'Ảnh 10MB | PDF 20MB'}</span>
          </div>
        </div>
      </label>

      {!disabled && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          id="hero-file-input"
          className="hidden"
          disabled={disabled}
        />
      )}
    </>
  );
}
