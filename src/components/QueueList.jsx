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
    return <ImageIcon className="text-primary" size={24} strokeWidth={1.5} />;
  };

  const getStatusUI = (file) => {
    const { status, progress, retryInfo } = file;
    if (status === 'processing' && retryInfo) {
      const { attempt, secondsLeft } = retryInfo;
      return { 
        label: `Thử lại (${attempt}) sau ${secondsLeft}s...`, 
        icon: <Loader2 size={16} className="animate-spin text-amber-500" />, 
        color: 'text-amber-600', 
        bar: 'bg-amber-500', 
        width: `${progress}%` 
      };
    }
    switch(status) {
      case 'splitting':
        return { label: 'Đang tách trang...', icon: <Loader2 size={16} className="animate-spin text-slate-400" />, color: 'text-slate-500', bar: 'bg-primary', width: `${progress}%` };
      case 'processing': 
        return { label: 'Đang xử lý...', icon: <Loader2 size={16} className="animate-spin text-primary" />, color: 'text-primary', bar: 'bg-primary', width: `${progress}%` };
      case 'completed': 
        return { label: 'Xong', icon: <CheckCircle2 size={16} className="text-emerald-500" />, color: 'text-emerald-600', bar: 'bg-emerald-500', width: '100%' };
      case 'error': 
        return { label: 'Lỗi', icon: <AlertCircle size={16} className="text-rose-500" />, color: 'text-rose-600', bar: 'bg-rose-500', width: '100%' };
      case 'waiting':
      default:
        return { label: 'Chờ xử lý', icon: <Clock size={16} className="text-slate-400" />, color: 'text-slate-500', bar: 'bg-slate-100', width: '0%' };
    }
  };

  const mainDocuments = files.filter(f => !f.isPdfPage);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0 font-sans">
      <h3 className="font-display text-base font-bold text-on-surface mb-4 flex items-center gap-2 shrink-0 select-none">
        Hàng đợi xử lý file
        <span className="bg-primary/10 text-primary border border-primary/20 py-0.5 px-2.5 rounded-full text-xs font-bold font-sans">
          {mainDocuments.length}
        </span>
      </h3>
      
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-4 flex-1 min-h-0">
        {mainDocuments.map((file) => {
          const statusUI = getStatusUI(file);
          const isActive = activeFileId === file.id;
          const pages = file.isParentPdf ? files.filter(p => p.parentPdfId === file.id && p.isPdfPage) : [];
          
          return (
            <div key={file.id} className="flex flex-col gap-2 bg-surface-bright/50 p-2 sm:p-2.5 rounded-xl border border-outline-variant/30">
              {/* File Card */}
              <div 
                onClick={() => onFileClick && onFileClick(file.id)}
                className={`bg-surface-container-lowest border rounded-xl p-3 shadow-sm hover:border-primary transition-all flex items-center gap-3 cursor-pointer group ${
                  isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/10' : 'border-slate-200'
                }`}
              >
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0 text-slate-700">
                  {getFileIcon(file.originalFile?.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <p className={`text-[15px] font-bold truncate pr-1 ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`} title={file.name}>
                      {file.name}
                    </p>
                    <div className={`flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0 ${statusUI.color}`}>
                      {statusUI.icon}
                      <span>{statusUI.label}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-500 font-bold">
                      {formatSize(file.originalFile?.size || 0)}
                    </p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(file.id); }}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 md:p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Xóa khỏi hàng đợi"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${statusUI.bar} transition-all duration-500 ease-out`} 
                      style={{ width: statusUI.width }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Subpages of PDF */}
              {pages.length > 0 && (
                <div className="pl-3.5 pr-1 flex flex-col gap-1.5 border-l-2 border-primary/30 ml-6 py-0.5">
                  {pages.map((page) => {
                    const pageStatusUI = getStatusUI(page);
                    const isPageActive = activeFileId === page.id;
                    
                    return (
                      <div
                        key={page.id}
                        onClick={() => onFileClick && onFileClick(page.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all border ${
                          isPageActive 
                            ? 'bg-primary/5 border-primary text-on-surface shadow-sm' 
                            : 'bg-surface-container-lowest border-slate-200 text-on-surface-variant hover:bg-slate-50 hover:text-on-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                           <ImageIcon size={14} className={isPageActive ? 'text-primary' : 'text-slate-400'} />
                          <span className="truncate">{`Trang ${page.pageIndex + 1}`}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`flex items-center gap-1 text-xs font-bold ${pageStatusUI.color}`}>
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
