import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomMindmapNode = ({ data, selected }) => {
  const isRoot = data.nodeType === 'caseRoot';
  const isCategory = data.nodeType === 'category';
  const isDetail = data.nodeType === 'detail';
  const isPlaceholder = data.isPlaceholder;

  // Xây dựng các lớp Tailwind CSS dựa trên loại node
  let className = "relative px-4 py-3 shadow-md rounded-xl text-left border font-sans w-[280px] transition-all bg-white ";
  
  if (selected) {
    className += "ring-2 ring-offset-2 ring-[#2F5FA7] border-[#2F5FA7] scale-[1.02] ";
  }

  let bodyStyle = {};
  let labelStyle = "text-xs font-semibold break-words whitespace-pre-wrap leading-relaxed ";

  if (isRoot) {
    className += "bg-[#163A70] border-[#0F2952] text-white";
    labelStyle = "text-sm font-bold block mb-1 text-white";
  } else if (isCategory) {
    className += "bg-white border-slate-200 text-slate-800";
    labelStyle += "text-slate-900";
    // Đặt đường viền màu trái đặc trưng cho từng danh mục pháp lý
    bodyStyle = { borderLeft: `4px solid ${data.accentColor || '#163A70'}` };
  } else if (isPlaceholder) {
    className += "bg-rose-50/70 border-rose-200 border-dashed text-rose-700";
    labelStyle += "text-rose-800 font-bold animate-pulse";
  } else {
    className += "bg-slate-50/80 border-slate-200 text-slate-700";
    labelStyle += "text-slate-800 font-medium";
  }

  return (
    <div className={className} style={bodyStyle}>
      {/* Cổng Target (Đầu vào) ở bên Trái - hiển thị cho mọi node ngoại trừ Node gốc */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ 
            background: isPlaceholder ? '#f43f5e' : '#94a3b8', 
            width: 8, 
            height: 8,
            left: -4
          }}
        />
      )}
      
      <div>
        {isRoot && (
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block mb-0.5 text-slate-300">
            👑 Vụ Án / Báo Cáo
          </span>
        )}
        {isCategory && (
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
            Danh Mục
          </span>
        )}
        <div className={labelStyle}>
          {data.label}
        </div>
      </div>

      {/* Cổng Source (Đầu ra) ở bên Phải - hiển thị cho mọi node ngoại trừ Node chi tiết / Node rỗng */}
      {!isDetail && !isPlaceholder && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ 
            background: data.accentColor || '#163A70', 
            width: 8, 
            height: 8,
            right: -4
          }}
        />
      )}
    </div>
  );
};

export default memo(CustomMindmapNode);
