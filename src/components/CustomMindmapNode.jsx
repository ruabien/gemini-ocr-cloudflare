import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomMindmapNode = ({ data, selected }) => {
  const isRoot = data.nodeType === 'caseRoot';
  const isCategory = data.nodeType === 'category';
  const isSubBranch = data.nodeType === 'subBranch';
  const isDetail = data.nodeType === 'detail';
  const isPlaceholder = data.isPlaceholder;

  // Xây dựng lớp CSS dựa trên cấp bậc node
  let className = "relative px-3.5 py-3 shadow-md rounded-xl text-left border font-sans w-[280px] transition-all bg-white ";
  
  if (selected) {
    className += "ring-2 ring-offset-2 ring-[#2F5FA7] border-[#2F5FA7] scale-[1.01] ";
  }

  let bodyStyle = {};
  let labelStyle = "text-xs font-semibold break-words whitespace-pre-wrap leading-relaxed ";

  if (isRoot) {
    className += "bg-[#163A70] border-[#0F2952] text-white";
    labelStyle = "text-sm font-bold block mb-1 text-white";
  } else if (isCategory) {
    className += "bg-white border-slate-200 text-slate-800";
    labelStyle += "text-slate-900";
    // Đường viền trái màu nổi bật nhánh chính
    bodyStyle = { borderLeft: `4px solid ${data.accentColor || '#163A70'}` };
  } else if (isSubBranch) {
    className += "bg-slate-50/90 border-slate-200 text-slate-700";
    labelStyle += "text-slate-800 font-semibold";
    bodyStyle = { borderLeft: `3px dashed ${data.accentColor || '#163A70'}` };
  } else if (isPlaceholder) {
    className += "bg-rose-50/70 border-rose-200 border-dashed text-rose-700";
    labelStyle += "text-rose-800 font-bold animate-pulse";
  } else {
    // Node chi tiết
    className += "bg-slate-50/50 border-slate-200 text-slate-700";
    labelStyle += "text-slate-700 font-medium";
  }

  // Xác định vị trí cổng cắm dựa trên hướng xoay trục (Ngang vs Dọc)
  const isVertical = data.orientation === 'vertical';
  const targetPos = isVertical ? Position.Top : Position.Left;
  const sourcePos = isVertical ? Position.Bottom : Position.Right;

  return (
    <div className={className} style={bodyStyle}>
      {/* Handles bên Trái/Trên cho mọi node trừ Root */}
      {!isRoot && (
        <Handle
          type="target"
          position={targetPos}
          style={{ 
            background: isPlaceholder ? '#f43f5e' : '#94a3b8', 
            width: 7, 
            height: 7,
            left: isVertical ? '50%' : -4.5,
            top: isVertical ? -4.5 : '50%',
            transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)'
          }}
        />
      )}
      
      <div>
        {isRoot && (
          <span className="text-[9px] uppercase font-bold tracking-widest opacity-75 block mb-1 text-slate-300">
            👑 HƯỚNG DẪN 10/HD-VKSTC
          </span>
        )}
        {isCategory && (
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
            Nhánh cấp 1
          </span>
        )}
        {isSubBranch && (
          <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
            Nhánh cấp 2
          </span>
        )}
        <div className={labelStyle}>
          {data.label}
        </div>

        {/* Render Ghi chú (Note) trực tiếp trong node nếu có */}
        {data.note && (
          <div className="mt-2 pt-1.5 border-t border-slate-100/80 text-[10px] text-slate-500 font-normal flex items-start gap-1 select-text">
            <span className="material-icons text-[12px] text-amber-500 shrink-0 mt-0.5">edit_note</span>
            <span className="break-words whitespace-pre-wrap">{data.note}</span>
          </div>
        )}

        {/* Render Tài liệu/Chứng cứ liên quan (Evidence) trong node nếu có */}
        {data.evidence && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100/80 text-[10px] text-slate-600 font-medium flex items-start gap-1 select-text">
            <span className="material-icons text-[11px] text-primary shrink-0 mt-0.5">attach_file</span>
            <span className="break-words whitespace-pre-wrap">Chứng cứ: {data.evidence}</span>
          </div>
        )}
      </div>

      {/* Handles bên Phải/Dưới cho các node cha phát triển nhánh con */}
      {!isDetail && !isPlaceholder && (
        <Handle
          type="source"
          position={sourcePos}
          style={{ 
            background: data.accentColor || '#163A70', 
            width: 7, 
            height: 7,
            right: isVertical ? 'auto' : -4.5,
            left: isVertical ? '50%' : 'auto',
            bottom: isVertical ? -4.5 : 'auto',
            top: isVertical ? 'auto' : '50%',
            transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)'
          }}
        />
      )}
    </div>
  );
};

export default memo(CustomMindmapNode);
