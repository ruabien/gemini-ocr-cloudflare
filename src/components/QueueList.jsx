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
        icon: <Loader2 size={16} className="animate-spin text-amber-400" />, 
        color: 'text-amber-400', 
        bar: 'bg-amber-500', 
        width: `${progress}%` 
      };
    }
    switch(status) {
      case 'splitting':
        return { label: 'Đang tách trang...', icon: <Loader2 size={16} className="animate-spin text-amber-400" />, color: 'text-amber-400', bar: 'bg-amber-500', width: `${progress}%` };
      case 'processing': 
        return { label: 'Đang xử lý AI...', icon: <Loader2 size={16} className="animate-spin text-indigo-400" />, color: 'text-indigo-400', bar: 'bg-indigo-500', width: `${progress}%` };
      case 'completed': 
        return { label: 'Hoàn thành', icon: <CheckCircle2 size={16} className="text-emerald-400" />, color: 'text-emerald-400', bar: 'bg-emerald-500', width: '100%' };
      case 'error': 
        return { label: 'Lỗi', icon: <AlertCircle size={16} className="text-rose-450" />, color: 'text-rose-400', bar: 'bg-rose-500', width: '100%' };
      case 'waiting':
      default:
        return { label: 'Chờ xử lý', icon: <Clock size={16} className="text-slate-500" />, color: 'text-slate-450', bar: 'bg-slate-700', width: '0%' };
    }
  };

  // Chỉ đếm số lượng tài liệu chính (tệp ảnh hoặc tệp PDF cha)
  const mainDocuments = files.filter(f => !f.isPdfPage);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2 shrink-0">
        Danh sách hàng đợi
        <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 py-0.5 px-2.5 rounded-full text-xs font-bold">
          {mainDocuments.length}
        </span>
      </h3>
      
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 flex-1 min-h-0">
        {mainDocuments.map((file) => {
          const statusUI = getStatusUI(file);
          const isActive = activeFileId === file.id;
          const pages = file.isParentPdf ? files.filter(p => p.parentPdfId === file.id && p.isPdfPage) : [];
          
          return (
            <div key={file.id} className="flex flex-col gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800/60">
              {/* Card Tài liệu chính (Ảnh hoặc PDF cha) */}
              <div 
                onClick={() => onFileClick && onFileClick(file.id)}
                className={`bg-slate-900 border rounded-xl p-3 shadow-sm hover:border-slate-700 hover:shadow-md transition-all flex items-center gap-3 cursor-pointer group ${
                  isActive ? 'border-emerald-500/40 ring-1 ring-emerald-500/30 bg-emerald-500/5' : 'border-slate-800/80'
                }`}
              >
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                  {getFileIcon(file.originalFile?.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-semibold truncate pr-2 ${isActive ? 'text-white' : 'text-slate-300'}`} title={file.name}>
                      {file.name}
                    </p>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${statusUI.color}`}>
                      {statusUI.icon}
                      {statusUI.label}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-500 font-medium">
                      {formatSize(file.originalFile?.size || 0)}
                    </p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-md transition-all"
                      title="Xóa khỏi hàng đợi"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${statusUI.bar} transition-all duration-500 ease-out`} 
                      style={{ width: statusUI.width }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Danh sách trang con của PDF (thụt lề) */}
              {pages.length > 0 && (
                <div className="pl-4 pr-1 flex flex-col gap-1.5 border-l-2 border-slate-800 ml-6 py-0.5">
                  {pages.map((page) => {
                    const pageStatusUI = getStatusUI(page);
                    const isPageActive = activeFileId === page.id;
                    
                    return (
                      <div
                        key={page.id}
                        onClick={() => onFileClick && onFileClick(page.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                          isPageActive 
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400 shadow-sm' 
                            : 'bg-slate-900/60 border-slate-800/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ImageIcon size={14} className={isPageActive ? 'text-emerald-450' : 'text-slate-500'} />
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
