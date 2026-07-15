import React from 'react';

interface KnowledgeCTAProps {
  text?: string;
  onClick?: () => void;
  href?: string; // optional link
}

export const KnowledgeCTA: React.FC<KnowledgeCTAProps> = ({
  text = 'Bắt đầu OCR miễn phí',
  onClick,
  href,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const commonCls =
    'inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white text-sm font-medium rounded-lg transition-colors duration-150';

  if (href) {
    return (
      <a href={href} className={commonCls} onClick={handleClick}>
        {text}
      </a>
    );
  }

  return (
    <button type="button" className={commonCls} onClick={handleClick}>
      {text}
    </button>
  );
};
