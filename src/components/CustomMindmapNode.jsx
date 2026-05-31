import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomMindmapNode = ({ data, selected }) => {
  const isRoot = data.nodeType === 'caseRoot';
  const isCategory = data.nodeType === 'category';
  const isSubBranch = data.nodeType === 'subBranch';
  const isDetail = data.nodeType === 'detail';
  const isPlaceholder = data.isPlaceholder;

  // Detections for detail nodes (Evidence, Timeline, Legal Issue)
  let finalNodeType = data.nodeType;
  if (data.nodeType === 'detail') {
    const labelLower = (data.label || '').toLowerCase();
    if (labelLower.includes('chứng cứ') || labelLower.includes('bút lục') || labelLower.includes('tài liệu') || data.evidence) {
      finalNodeType = 'evidence';
    } else if (labelLower.includes('ngày') || labelLower.includes('tháng') || labelLower.includes('năm') || labelLower.includes('hành vi') || /^\d{2}h\d{2}/.test(labelLower) || /^\d{1,2}[/-]\d{1,2}/.test(labelLower)) {
      finalNodeType = 'timeline';
    } else if (labelLower.includes('❓') || labelLower.includes('câu hỏi') || labelLower.includes('yêu cầu') || labelLower.includes('làm rõ') || labelLower.includes('pháp lý')) {
      finalNodeType = 'legalIssue';
    }
  }

  const theme = data.theme || 'classic_judicial';

  let className = "relative px-4 py-3.5 rounded-xl text-left border font-sans w-[280px] transition-all duration-300 select-none ";
  let labelStyle = "text-xs font-semibold break-words whitespace-pre-wrap leading-relaxed ";
  let wrapperStyle = {};
  let iconName = "";

  // Assign material icons based on node category type
  if (isRoot) iconName = "gavel";
  else if (isCategory) iconName = "folder_open";
  else if (isSubBranch) iconName = "subtitles";
  else if (finalNodeType === 'evidence') iconName = "snippet_folder";
  else if (finalNodeType === 'timeline') iconName = "history";
  else if (finalNodeType === 'legalIssue') iconName = "help_outline";

  // Theme styling mapping
  if (theme === 'classic_judicial') {
    if (selected) {
      className += "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900 border-amber-500 scale-[1.03] ";
    } else {
      className += "shadow-lg hover:shadow-xl hover:scale-[1.01] ";
    }
    
    if (isRoot) {
      className += "bg-gradient-to-br from-[#0c2340] to-[#1e3a8a] border-amber-500 text-white border-2 ";
      labelStyle = "text-sm font-bold tracking-wide text-amber-100 ";
    } else if (isCategory) {
      className += "bg-slate-800 border-slate-700 text-slate-100 ";
      labelStyle += "text-white font-bold ";
      wrapperStyle = { borderLeft: `5px solid ${data.accentColor || '#3b82f6'}` };
    } else if (isSubBranch) {
      className += "bg-slate-900/95 border-slate-700 text-slate-200 ";
      labelStyle += "text-slate-100 font-semibold ";
      wrapperStyle = { borderLeft: `3.5px dashed ${data.accentColor || '#3b82f6'}` };
    } else if (isPlaceholder) {
      className += "bg-red-950/20 border-red-800/50 border-dashed text-red-400 ";
      labelStyle += "text-red-300 font-semibold animate-pulse ";
    } else if (finalNodeType === 'evidence') {
      className += "bg-slate-900/40 border-emerald-800/40 text-slate-300 ";
      labelStyle += "text-slate-200 font-medium ";
      wrapperStyle = { borderLeft: `4px solid #10b981` };
    } else if (finalNodeType === 'timeline') {
      className += "bg-slate-900/40 border-sky-800/40 text-slate-300 ";
      labelStyle += "text-slate-200 font-medium ";
      wrapperStyle = { borderLeft: `4px solid #0ea5e9` };
    } else if (finalNodeType === 'legalIssue') {
      className += "bg-slate-900/40 border-amber-800/40 text-slate-300 ";
      labelStyle += "text-slate-200 font-medium ";
      wrapperStyle = { borderLeft: `4px solid #f59e0b` };
    } else {
      className += "bg-slate-900/20 border-slate-800 text-slate-300 ";
      labelStyle += "text-slate-300 font-normal ";
      wrapperStyle = { borderLeft: `4px solid #64748b` };
    }

  } else if (theme === 'presentation_pro') {
    if (selected) {
      className += "ring-2 ring-cyan-400 scale-[1.03] ";
    } else {
      className += "hover:scale-[1.02] shadow-[0_4px_16px_rgba(0,0,0,0.6)] ";
    }

    if (isRoot) {
      className += "bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#1e3a8a] border-cyan-400 border-2 text-white shadow-[0_0_15px_rgba(34,211,238,0.25)] ";
      labelStyle = "text-sm font-extrabold tracking-wide text-cyan-200 uppercase ";
    } else if (isCategory) {
      className += "bg-[#0f172a]/95 backdrop-blur-md border-slate-800 text-white ";
      labelStyle += "text-white font-extrabold ";
      const glowColor = data.accentColor || '#38bdf8';
      wrapperStyle = { 
        borderLeft: `5px solid ${glowColor}`,
        boxShadow: `0 0 10px ${glowColor}1a` 
      };
    } else if (isSubBranch) {
      className += "bg-[#1e293b]/90 backdrop-blur-md border-slate-850 text-slate-200 rounded-full py-2.5 px-5 ";
      labelStyle += "text-slate-100 font-bold text-center ";
      const glowColor = data.accentColor || '#38bdf8';
      wrapperStyle = { 
        border: `1.5px solid ${glowColor}40`,
        boxShadow: `0 0 8px ${glowColor}10` 
      };
    } else if (isPlaceholder) {
      className += "bg-[#ef4444]/10 border-red-500 border-dashed text-red-400 animate-pulse ";
      labelStyle += "text-red-300 font-bold ";
    } else if (finalNodeType === 'evidence') {
      className += "bg-[#111827]/85 border-emerald-800/80 text-emerald-300 ";
      labelStyle += "text-emerald-200 font-medium ";
      wrapperStyle = { 
        borderLeft: '4px solid #10b981',
        boxShadow: '0 0 8px rgba(16,185,129,0.15)' 
      };
    } else if (finalNodeType === 'timeline') {
      className += "bg-[#111827]/85 border-cyan-800/80 text-cyan-300 ";
      labelStyle += "text-cyan-200 font-medium ";
      wrapperStyle = { 
        borderLeft: '4px solid #06b6d4',
        boxShadow: '0 0 8px rgba(6,182,212,0.15)' 
      };
    } else if (finalNodeType === 'legalIssue') {
      className += "bg-[#111827]/85 border-rose-800/80 text-rose-300 ";
      labelStyle += "text-rose-200 font-medium ";
      wrapperStyle = { 
        borderLeft: '4px solid #f43f5e',
        boxShadow: '0 0 8px rgba(244,63,94,0.15)' 
      };
    } else {
      className += "bg-[#111827]/80 border-slate-800 text-slate-400 ";
      labelStyle += "text-slate-300 font-normal ";
    }

  } else if (theme === 'investigation_board') {
    className += "rounded-lg border-2 border-[#8b5a2b] ";
    
    if (selected) {
      className += "ring-4 ring-red-500 scale-[1.03] rotate-1 ";
    } else {
      className += "shadow-md hover:scale-[1.01] -rotate-1 ";
    }

    if (isRoot) {
      className += "bg-[#fcfaf2] text-[#3e2723] p-5 border-double border-4 ";
      labelStyle = "text-sm font-bold tracking-tight text-[#3e2723] font-serif ";
    } else if (isCategory) {
      className += "bg-[#fff3e0] text-[#5d4037] ";
      labelStyle += "font-bold font-serif ";
      wrapperStyle = { borderTop: `4px solid ${data.accentColor || '#8b5a2b'}` };
    } else if (isSubBranch) {
      className += "bg-[#fffae0] text-[#5d4037] border-dashed rounded-md ";
      labelStyle += "font-semibold ";
    } else if (isPlaceholder) {
      className += "bg-[#ffebee] border-red-700 border-dashed text-red-900 ";
      labelStyle += "font-bold animate-bounce ";
    } else if (finalNodeType === 'evidence') {
      className += "bg-[#e8f5e9] text-emerald-900 border-emerald-700 ";
      labelStyle += "font-medium ";
    } else if (finalNodeType === 'timeline') {
      className += "bg-[#e3f2fd] text-blue-900 border-blue-700 ";
      labelStyle += "font-medium ";
    } else if (finalNodeType === 'legalIssue') {
      className += "bg-[#fbe9e7] text-orange-950 border-orange-700 ";
      labelStyle += "font-medium ";
    } else {
      className += "bg-[#fcfaf2] text-[#4e342e] ";
      labelStyle += "font-normal ";
    }

  } else if (theme === 'executive_summary') {
    className += "rounded-none border-2 border-slate-900 bg-white text-slate-900 ";
    
    if (selected) {
      className += "ring-2 ring-black ring-offset-1 border-black scale-[1.02] ";
    }

    if (isRoot) {
      className += "bg-[#18181b] border-2 border-black text-white ";
      labelStyle = "text-xs font-black uppercase tracking-widest text-white ";
    } else if (isCategory) {
      className += "bg-white border-2 border-black ";
      labelStyle += "font-black uppercase text-xs ";
      wrapperStyle = { borderLeft: `8px solid ${data.accentColor || '#18181b'}` };
    } else if (isSubBranch) {
      className += "bg-white border border-slate-800 rounded-none py-1.5 ";
      labelStyle += "font-bold text-center text-xs ";
    } else if (isPlaceholder) {
      className += "bg-white border-2 border-dashed border-red-600 text-red-600 ";
      labelStyle += "font-bold text-xs ";
    } else if (finalNodeType === 'evidence') {
      className += "bg-white border border-slate-900 ";
      labelStyle += "font-semibold ";
      wrapperStyle = { borderLeft: `6px solid #10b981` };
    } else if (finalNodeType === 'timeline') {
      className += "bg-white border border-slate-900 ";
      labelStyle += "font-semibold ";
      wrapperStyle = { borderLeft: `6px solid #3b82f6` };
    } else if (finalNodeType === 'legalIssue') {
      className += "bg-white border border-slate-900 ";
      labelStyle += "font-semibold ";
      wrapperStyle = { borderLeft: `6px solid #ef4444` };
    } else {
      className += "bg-white border border-slate-300 ";
      labelStyle += "font-normal ";
    }
  }

  // Calculate sequential reveal delay
  const delay = (data.depth || 0) * 0.15 + (data.seqIndex || 0) * 0.05;
  const animatedStyle = {
    ...wrapperStyle,
    animationDelay: `${delay}s`
  };

  // Determine connection handles based on orientation (Ngang vs Dọc)
  const isVertical = data.orientation === 'vertical';
  const targetPos = isVertical ? Position.Top : Position.Left;
  const sourcePos = isVertical ? Position.Bottom : Position.Right;

  return (
    <div 
      className={`custom-node-reveal ${className}`} 
      style={animatedStyle}
    >
      {/* Red push-pin graphic for Investigation Board theme */}
      {theme === 'investigation_board' && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-md z-10 flex items-center justify-center">
          <div className="w-1 h-1 bg-red-900 rounded-full"></div>
        </div>
      )}

      {/* Target input handle (Left/Top) for non-root nodes */}
      {!isRoot && (
        <Handle
          type="target"
          position={targetPos}
          style={{ 
            background: isPlaceholder ? '#ef4444' : (theme === 'presentation_pro' ? '#22d3ee' : '#94a3b8'), 
            width: 8, 
            height: 8,
            left: isVertical ? '50%' : -4,
            top: isVertical ? -4 : '50%',
            transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)',
            border: theme === 'presentation_pro' ? '1px solid #030712' : 'none'
          }}
        />
      )}
      
      <div className="flex flex-col gap-1">
        {/* Subtitle / Header badges */}
        {isRoot && (
          <div className="flex items-center gap-1.5 opacity-90 mb-0.5">
            <span className="material-icons text-[12px] text-amber-400">gavel</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300">
              👑 HƯỚNG DẪN 10/HD-VKSTC
            </span>
          </div>
        )}
        
        {!isRoot && (
          <div className="flex items-center justify-between shrink-0 mb-0.5 opacity-75">
            <div className="flex items-center gap-1">
              {iconName && <span className="material-icons text-[11px] text-slate-400">{iconName}</span>}
              <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">
                {isCategory ? 'Danh mục L1' : 
                 isSubBranch ? 'Nhánh L2' : 
                 finalNodeType === 'evidence' ? 'Chứng cứ' :
                 finalNodeType === 'timeline' ? 'Thời gian' :
                 finalNodeType === 'legalIssue' ? 'Vấn đề pháp lý' : 'Chi tiết L3'}
              </span>
            </div>
            {data.evidence && finalNodeType !== 'evidence' && (
              <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-800 px-1 py-0.2 rounded font-bold uppercase tracking-tight scale-90">Có chứng cứ</span>
            )}
          </div>
        )}

        <div className={labelStyle}>
          {data.label}
        </div>

        {/* Render Ghi chú (Note) trực tiếp trong node nếu có */}
        {data.note && (
          <div className={`mt-2 pt-1.5 border-t text-[10px] leading-relaxed flex items-start gap-1 select-text ${
            theme === 'presentation_pro' ? 'border-slate-800 text-slate-400' :
            theme === 'investigation_board' ? 'border-[#8b5a2b]/20 text-[#5d4037]' :
            theme === 'executive_summary' ? 'border-slate-300 text-slate-600 font-mono' :
            'border-slate-100 text-slate-500'
          }`}>
            <span className="material-icons text-[12px] text-amber-500 shrink-0 mt-0.5">edit_note</span>
            <span className="break-words whitespace-pre-wrap">{data.note}</span>
          </div>
        )}

        {/* Render Tài liệu/Chứng cứ liên quan (Evidence) trong node nếu có */}
        {data.evidence && (
          <div className={`mt-1.5 pt-1.5 border-t text-[10px] leading-relaxed flex items-start gap-1 select-text font-medium ${
            theme === 'presentation_pro' ? 'border-slate-800 text-emerald-400' :
            theme === 'investigation_board' ? 'border-[#8b5a2b]/20 text-emerald-850' :
            theme === 'executive_summary' ? 'border-slate-300 text-emerald-700' :
            'border-slate-100 text-slate-600'
          }`}>
            <span className="material-icons text-[11px] text-emerald-500 shrink-0 mt-0.5">attach_file</span>
            <span className="break-words whitespace-pre-wrap">Chứng cứ: {data.evidence}</span>
          </div>
        )}
      </div>

      {/* Source output handle (Right/Bottom) for branch nodes */}
      {!isDetail && !isPlaceholder && (
        <Handle
          type="source"
          position={sourcePos}
          style={{ 
            background: data.accentColor || '#163A70', 
            width: 8, 
            height: 8,
            right: isVertical ? 'auto' : -4,
            left: isVertical ? '50%' : 'auto',
            bottom: isVertical ? -4 : 'auto',
            top: isVertical ? 'auto' : '50%',
            transform: isVertical ? 'translateX(-50%)' : 'translateY(-50%)',
            border: theme === 'presentation_pro' ? '1px solid #030712' : 'none'
          }}
        />
      )}
    </div>
  );
};

export default memo(CustomMindmapNode);
