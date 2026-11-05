import React from 'react';

const LOGO_SRC = '/photos/logo.png';

export default function BrandLogo({
  theme = 'dark',
  size = 'medium',
  iconOnly = false,
  showWordmark = true,
  className = '',
  label = 'AquaGrow',
  width,
  height,
}) {
  const showText = showWordmark && !iconOnly;

  return (
    <span
      className={`brand-logo brand-logo-${theme} brand-logo-${size} ${iconOnly ? 'brand-logo-icon-only' : ''} ${className}`.trim()}
      aria-label={label}
      role="img"
    >
      <img
        className={`brand-logo-image ${showText ? '' : 'brand-logo-image-icon-only'}`.trim()}
        src={LOGO_SRC}
        alt={label}
        width={width}
        height={height}
      />
    </span>
  );
}
