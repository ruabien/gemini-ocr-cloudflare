import React, { useEffect, useState } from 'react';

interface HeadingItem {
  id: string;
  text: string;
}

interface KnowledgeTOCProps {
  slug?: string;
}

export const KnowledgeTOC: React.FC<KnowledgeTOCProps> = ({ slug }) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Find all H2s inside the main article container
    const articleElement = document.querySelector('article');
    if (!articleElement) return;

    // Filter out our own TOC heading and other h2s outside the main content if any
    const h2Elements = Array.from(articleElement.querySelectorAll('h2[id]'))
      .filter((el) => el.id !== 'toc-heading');

    const items: HeadingItem[] = h2Elements.map((el) => ({
      id: el.id,
      text: el.textContent || '',
    }));

    setHeadings(items);

    // Setup intersection observer to highlight active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -70% 0px', // Trigger when heading is near the top
      }
    );

    h2Elements.forEach((el) => observer.observe(el));

    return () => {
      h2Elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [slug]);

  if (headings.length === 0) return null;

  const handleScrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // offset for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
      setActiveId(id);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile/Tablet TOC (Collapsible Menu at the top of content) */}
      <div className="lg:hidden my-6 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 focus:outline-none"
        >
          <span className="text-sm uppercase tracking-wider">Trong bài viết này</span>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <nav className="border-t border-slate-200 p-4 bg-white">
            <ul className="space-y-2">
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    onClick={(e) => handleScrollTo(heading.id, e)}
                    className={`block text-sm py-1 transition-colors ${
                      activeId === heading.id
                        ? 'text-blue-600 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop TOC (Sticky Sidebar) */}
      <nav className="hidden lg:block w-64 shrink-0" aria-label="Table of contents">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 select-none">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">
            Mục lục
          </h2>
          <ul className="space-y-2.5 border-l border-slate-100 pl-0">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleScrollTo(heading.id, e)}
                  className={`block text-xs py-1 pl-4 -ml-[1px] border-l transition-all leading-relaxed ${
                    activeId === heading.id
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
};
