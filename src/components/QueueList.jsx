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
    if (type && type.includes('pdf')) return <FileText className="text-accent" size={24} strokeWidth={1.5} />;
    return <ImageIcon className="text-primary" size={24} strokeWidth={1.5} />;
  };

  const getStatusUI = (file) => {
    const { status, progress, retryInfo } = file;
    if (status === 'processing' && retryInfo) {
      const { attempt, secondsLeft, customMessage } = retryInfo;
      return { 
        label: customMessage || `Thử lại ${attempt} sau ${secondsLeft}s...`, 
        icon: <Loader2 size={16} className="animate-spin text-secondary" />, 
        color: 'text-secondary', 
        bar: 'bg-secondary/20', 
        width: `${progress}%` 
      };
    }
    switch(status) {
      case 'splitting':
        return { label: 'Đang tách trang...', icon: <Loader2 size={16} className="animate-spin text-secondary" />, color: 'text-secondary', bar: 'bg-secondary/20', width: `${progress}%` };
      case 'processing': 
        return { label: `Đang xử lý... (${progress}%)`, icon: <Loader2 size={16} className="animate-spin text-primary" />, color: 'text-primary', bar: 'bg-primary', width: `${progress}%` };
      case 'completed': 
        return { label: 'Hoàn thành', icon: <CheckCircle2 size={16} className="text-success" />, color: 'text-success', bar: 'bg-success', width: '100%' };
      case 'error': 
        return { label: 'Lỗi', icon: <AlertCircle size={16} className="text-accent" />, color: 'text-accent', bar: 'bg-accent', width: '100%' };
      case 'waiting':
      default:
        return { label: 'Chờ xử lý', icon: <Clock size={16} className="text-text-secondary/50" />, color: 'text-text-secondary/70', bar: 'bg-border', width: '0%' };
    }
  };

  // Chỉ đếm số lượng tài liệu chính (tệp ảnh hoặc tệp PDF cha)
  const mainDocuments = files.filter(f => !f.isPdfPage);

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2 shrink-0">
        Hàng đợi xử lý
        <span className="bg-primary/10 border border-primary/20 text-primary py-0.5 px-2.5 rounded-full text-xs font-bold font-mono">
          {mainDocuments.length}
        </span>
      </h3>
      
      <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-4 flex-1 min-h-0">
        {mainDocuments.map((file) => {
          const statusUI = getStatusUI(file);
          const isActive = activeFileId === file.id;
          const pages = file.isParentPdf ? files.filter(p => p.parentPdfId === file.id && p.isPdfPage) : [];
          
          return (
            <div key={file.id} className="flex flex-col gap-2 bg-background p-2 rounded-2xl border border-border/60">
              {/* Card Tài liệu chính (Ảnh hoặc PDF cha) */}
              <div 
                onClick={() => onFileClick && onFileClick(file.id)}
                className={`bg-surface border rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-primary/50 hover:shadow-sm transition-all flex items-center gap-3 cursor-pointer group ${
                  isActive ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="p-2 bg-background rounded-lg border border-border/50 shrink-0">
                  {getFileIcon(file.originalFile?.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-1">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-text-primary'}`} title={file.name}>
                      {file.name}
                    </p>
                    <div className={`flex items-center gap-1 text-[10px] font-bold whitespace-nowrap ${statusUI.color}`}>
                      {statusUI.icon}
                      {statusUI.label}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[10px] text-text-secondary font-medium">
                      {formatSize(file.originalFile?.size || 0)}
                    </p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-md transition-all cursor-pointer"
                      title="Xóa khỏi hàng đợi"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  
                  <div className="w-full bg-border rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-1 rounded-full ${statusUI.bar} transition-all duration-500 ease-out`} 
                      style={{ width: statusUI.width }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Danh sách trang con của PDF (thụt lề) */}
              {pages.length > 0 && (
                <div className="pl-3.5 pr-1 flex flex-col gap-1.5 border-l border-border ml-5 py-0.5">
                  {pages.map((page) => {
                    const pageStatusUI = getStatusUI(page);
                    const isPageActive = activeFileId === page.id;
                    
                    return (
                      <div
                        key={page.id}
                        onClick={() => onFileClick && onFileClick(page.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          isPageActive 
                            ? 'bg-primary/5 border-primary/20 text-primary shadow-sm' 
                            : 'bg-surface border-border text-text-secondary hover:bg-background hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                           <ImageIcon size={12} className={isPageActive ? 'text-primary' : 'text-text-secondary/60'} />
                          <span className="truncate text-[11px]">{`Trang ${page.pageIndex + 1}`}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`flex items-center gap-1 text-[10px] font-bold ${pageStatusUI.color}`}>
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

