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
    <>
      <div
        className={`w-full p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer bg-white min-h-[300px] ${
          isDragActive ? 'border-blue-500 bg-blue-50/50 shadow-sm scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = null; // Reset value so the same file can be selected again safely
            fileInputRef.current.click();
          }
        }}
      >
        <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {isDragActive ? 'Thả file vào đây...' : 'Kéo thả file của bạn vào đây'}
        </h3>
        <p className="text-gray-500 text-center text-sm">
          Hoặc click để duyệt file từ máy tính của bạn<br/>
          <span className="text-xs text-gray-400 mt-2 block font-medium">Hỗ trợ các định dạng: JPG, PNG, PDF</span>
        </p>
      </div>

      {/* Đặt thẻ input nằm ngoài div tương tác để chặn đứng 100% hiện tượng Event Bubbling gây vòng lặp vô tận */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept=".jpg,.jpeg,.png,.pdf"
        multiple
        className="hidden"
      />
    </>
  );
}
