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
    if (type.includes('pdf')) return <FileText className="text-red-500" size={24} strokeWidth={1.5} />;
    return <ImageIcon className="text-blue-500" size={24} strokeWidth={1.5} />;
  };

  const getStatusUI = (status, progress) => {
    switch(status) {
      case 'processing': 
        return { label: 'Đang xử lý AI...', icon: <Loader2 size={16} className="animate-spin text-blue-500" />, color: 'text-blue-600', bar: 'bg-blue-500', width: `${progress}%` };
      case 'completed': 
        return { label: 'Hoàn thành', icon: <CheckCircle2 size={16} className="text-green-500" />, color: 'text-green-600', bar: 'bg-green-500', width: '100%' };
      case 'error': 
        return { label: 'Lỗi', icon: <AlertCircle size={16} className="text-red-500" />, color: 'text-red-600', bar: 'bg-red-500', width: '100%' };
      case 'waiting':
      default:
        return { label: 'Chờ xử lý', icon: <Clock size={16} className="text-gray-400" />, color: 'text-gray-500', bar: 'bg-gray-200', width: '0%' };
    }
  };

  return (
    <div className="w-full flex flex-col h-full max-h-[600px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 shrink-0">
        Danh sách hàng đợi
        <span className="bg-blue-100 text-blue-700 py-0.5 px-2.5 rounded-full text-xs font-bold">
          {files.length}
        </span>
      </h3>
      
      <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
        {files.map((file) => {
          const statusUI = getStatusUI(file.status, file.progress);
          const isActive = activeFileId === file.id;
          
          return (
            <div 
              key={file.id} 
              onClick={() => onFileClick && onFileClick(file.id)}
              className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex items-center gap-3 cursor-pointer group ${
                isActive ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/20' : 'border-gray-100'
              }`}
            >
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                {getFileIcon(file.originalFile.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-sm font-medium truncate pr-2 ${isActive ? 'text-blue-700' : 'text-gray-900'}`} title={file.originalFile.name}>
                    {file.originalFile.name}
                  </p>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${statusUI.color}`}>
                    {statusUI.icon}
                    {statusUI.label}
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-500 font-medium">
                    {formatSize(file.originalFile.size)}
                  </p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(file.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-all"
                    title="Xóa khỏi hàng đợi"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full ${statusUI.bar} transition-all duration-500 ease-out`} 
                    style={{ width: statusUI.width }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
