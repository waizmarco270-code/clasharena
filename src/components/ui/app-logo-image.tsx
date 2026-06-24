'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AppLogoImageProps {
  fallbackUrl?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  alt?: string;
}

export function AppLogoImage({ fallbackUrl, className, fill, width, height, alt = "Logo" }: AppLogoImageProps) {
  const [imgSrc, setImgSrc] = useState('/logo.png');

  // If the fallbackUrl changes, reset the src back to check logo.png
  useEffect(() => {
    setImgSrc('/logo.png');
  }, [fallbackUrl]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      onError={() => {
        // If logo.png fails to load (404), switch to the custom Cloudinary logo
        if (fallbackUrl && imgSrc !== fallbackUrl) {
          setImgSrc(fallbackUrl);
        }
      }}
      priority
    />
  );
}
