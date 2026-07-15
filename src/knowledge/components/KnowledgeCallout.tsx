import React from 'react';

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

interface KnowledgeCalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

export const KnowledgeCallout: React.FC<KnowledgeCalloutProps> = ({
  type = 'info',
  title,
  children,
}) => {
  let bgColor = 'bg-blue-50 border-blue-500 text-slate-800';
  let titleColor = 'text-blue-700';
  let defaultEmoji = 'ℹ️';
  let defaultTitle = 'Thông tin';

  switch (type) {
    case 'tip':
      bgColor = 'bg-emerald-50 border-emerald-500 text-slate-800';
      titleColor = 'text-emerald-700';
      defaultEmoji = '💡';
      defaultTitle = 'Mẹo';
      break;
    case 'warning':
      bgColor = 'bg-amber-50 border-amber-500 text-slate-800';
      titleColor = 'text-amber-700';
      defaultEmoji = '⚠️';
      defaultTitle = 'Lưu ý';
      break;
    case 'danger':
      bgColor = 'bg-red-50 border-red-500 text-slate-800';
      titleColor = 'text-red-700';
      defaultEmoji = '🚨';
      defaultTitle = 'Cảnh báo';
      break;
  }

  const displayTitle = title || defaultTitle;

  return (
    <div className={`my-6 p-4 border-l-4 rounded-r-lg ${bgColor}`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`font-semibold text-sm flex items-center select-none ${titleColor}`}
          aria-hidden="true"
        >
          {defaultEmoji} {displayTitle}:
        </span>
        <div className="flex-1 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
