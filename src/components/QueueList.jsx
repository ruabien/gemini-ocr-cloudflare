import { FileText, Image as ImageIcon, CheckCircle2, Loader2, Clock, AlertCircle, X } from 'lucide-react';

export default function QueueList({ files, activeFileId, onFileClick, onRemoveFile }) {
  if (!files || files.length === 0) return null;

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type && type.includes('pdf')) return <FileText className="text-rose-500" size={24} strokeWidth={1.5} />;
    return <ImageIcon className="text-indigo-400" size={24} strokeWidth={1.5} />;
  };

  const getStatusUI = (file) => {
    const { status, progress, retryInfo } = file;
    if (status === 'processing' && retryInfo) {
      const { attempt, secondsLeft } = retryInfo;
      return { 
        label: `Bận, thử lại lần ${attempt} sau ${secondsLeft}s...`, 
        icon: <Loader2 size={16} className="animate-spin text-amber-500" />, 
        color: 'text-amber-600', 
        bar: 'bg-[#ffdd00]', 
        width: `${progress}%` 
      };
    }
    switch(status) {
      case 'splitting':
        return { label: 'Đang tách trang...', icon: <Loader2 size={16} className="animate-spin text-[#717171]" />, color: 'text-[#717171]', bar: 'bg-[#ffdd00]', width: `${progress}%` };
      case 'processing': 
        return { label: 'Đang xử lý AI...', icon: <Loader2 size={16} className="animate-spin text-[#222222]" />, color: 'text-[#222222]', bar: 'bg-[#ffdd00]', width: `${progress}%` };
      case 'completed': 
        return { label: 'Hoàn thành', icon: <CheckCircle2 size={16} className="text-emerald-500" />, color: 'text-emerald-600', bar: 'bg-emerald-500', width: '100%' };
      case 'error': 
        return { label: 'Lỗi', icon: <AlertCircle size={16} className="text-rose-500" />, color: 'text-rose-600', bar: 'bg-rose-500', width: '100%' };
      case 'waiting':
      default:
        return { label: 'Chờ xử lý', icon: <Clock size={16} className="text-slate-400" />, color: 'text-[#717171]', bar: 'bg-slate-200', width: '0%' };
    }
  };

  // Chỉ đếm số lượng tài liệu chính (tệp ảnh hoặc tệp PDF cha)
  const mainDocuments = files.filter(f => !f.isPdfPage);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <h3 className="text-sm font-extrabold text-[#222222] mb-4 flex items-center gap-2 shrink-0 select-none">
        Danh sách hàng đợi
        <span className="bg-[#ffdd00] text-[#222222] py-0.5 px-2 rounded-full text-[10px] font-black">
          {mainDocuments.length}
        </span>
      </h3>
      
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 flex-1 min-h-0">
        {mainDocuments.map((file) => {
          const statusUI = getStatusUI(file);
          const isActive = activeFileId === file.id;
          const pages = file.isParentPdf ? files.filter(p => p.parentPdfId === file.id && p.isPdfPage) : [];
          
          return (
            <div key={file.id} className="flex flex-col gap-2 bg-slate-50/50 p-2.5 rounded-[16px] border border-slate-200/50">
              {/* Card Tài liệu chính (Ảnh hoặc PDF cha) */}
              <div 
                onClick={() => onFileClick && onFileClick(file.id)}
                className={`bg-[#ffffff] border rounded-[12px] p-3 shadow-sm hover:border-[#ffdd00] hover:shadow-md transition-all flex items-center gap-3 cursor-pointer group ${
                  isActive ? 'border-[#ffdd00] ring-1 ring-[#ffdd00]/25 bg-[#ffdd00]/5' : 'border-slate-200'
                }`}
              >
                <div className="p-2.5 bg-slate-50 rounded-[8px] border border-slate-200 shrink-0">
                  {getFileIcon(file.originalFile?.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-xs font-bold truncate pr-2 ${isActive ? 'text-[#222222]' : 'text-[#717171]'}`} title={file.name}>
                      {file.name}
                    </p>
                    <div className={`flex items-center gap-1.5 text-[10px] font-extrabold whitespace-nowrap ${statusUI.color}`}>
                      {statusUI.icon}
                      {statusUI.label}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-[#717171] font-bold">
                      {formatSize(file.originalFile?.size || 0)}
                    </p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                      title="Xóa khỏi hàng đợi"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${statusUI.bar} transition-all duration-500 ease-out`} 
                      style={{ width: statusUI.width }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Danh sách trang con của PDF (thụt lề) */}
              {pages.length > 0 && (
                <div className="pl-3.5 pr-1 flex flex-col gap-1.5 border-l-2 border-[#ffdd00] ml-6 py-0.5">
                  {pages.map((page) => {
                    const pageStatusUI = getStatusUI(page);
                    const isPageActive = activeFileId === page.id;
                    
                    return (
                      <div
                        key={page.id}
                        onClick={() => onFileClick && onFileClick(page.id)}
                        className={`flex items-center justify-between p-2.5 rounded-[8px] text-[11px] font-bold cursor-pointer transition-all border ${
                          isPageActive 
                            ? 'bg-[#ffdd00]/10 border-[#ffdd00] text-[#222222] shadow-sm' 
                            : 'bg-[#ffffff] border-slate-200 text-[#717171] hover:bg-slate-50 hover:text-[#222222]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                           <ImageIcon size={14} className={isPageActive ? 'text-[#222222]' : 'text-slate-400'} />
                          <span className="truncate">{`Trang ${page.pageIndex + 1}`}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`flex items-center gap-1 text-[10px] font-semibold ${pageStatusUI.color}`}>
                            {pageStatusUI.icon}
                            <span>{pageStatusUI.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
