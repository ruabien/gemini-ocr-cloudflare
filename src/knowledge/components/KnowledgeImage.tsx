import React from 'react';

interface KnowledgeImageProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export const KnowledgeImage: React.FC<KnowledgeImageProps> = ({
  src,
  alt,
  caption,
  width,
  height,
}) => {
  const [hasError, setHasError] = React.useState(false);
  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) return null;

  return (
    <figure className="my-8 flex flex-col items-center">
<div className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
className="block w-full h-auto"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
      {caption && (
        <figcaption className="text-center text-xs text-slate-400 mt-2.5 leading-relaxed italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
