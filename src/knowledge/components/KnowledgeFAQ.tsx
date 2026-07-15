import React, { useState } from 'react';

export interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface KnowledgeFAQProps {
  items: FAQItem[];
  title?: string;
}

export const KnowledgeFAQ: React.FC<KnowledgeFAQProps> = ({
  items,
  title = 'Câu hỏi thường gặp (FAQ)',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = React.useId();

  if (!items || items.length === 0) return null;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mt-12 mb-10 pt-8 border-t border-slate-100">
      <h2 id="faq" className="scroll-mt-20 text-2xl font-bold text-slate-900 mb-6">
        {title}
      </h2>
      <div className="space-y-4">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          const buttonId = `${baseId}-btn-${index}`;
          const panelId = `${baseId}-panel-${index}`;
          return (
            <div
              key={index}
              className="group border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors shadow-sm"
            >
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-4 font-semibold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:text-blue-600 rounded-xl"
              >
                <span className="text-sm sm:text-base pr-4 leading-snug text-left">{item.question}</span>
                <span className={`transition-transform duration-200 text-slate-400 shrink-0 bg-slate-50 rounded-full p-1 group-hover:bg-slate-100 group-hover:text-blue-600 ${isOpen ? 'rotate-180' : ''}`}>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
              >
                {item.answer}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
