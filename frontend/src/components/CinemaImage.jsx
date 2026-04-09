import { useEffect, useState } from 'react';

function CinemaImage({ src, fallbackSrc, alt, className, loading = 'lazy', onError, ...props }) {
  const [resolvedSrc, setResolvedSrc] = useState(src || fallbackSrc || '');

  useEffect(() => {
    setResolvedSrc(src || fallbackSrc || '');
  }, [src, fallbackSrc]);

  const handleError = (event) => {
    if (fallbackSrc && resolvedSrc !== fallbackSrc) {
      setResolvedSrc(fallbackSrc);
    }
    if (typeof onError === 'function') {
      onError(event);
    }
  };

  return (
    <img
      src={resolvedSrc || fallbackSrc || ''}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
      {...props}
    />
  );
}

export default CinemaImage;
