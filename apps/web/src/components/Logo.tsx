type Props = { className?: string };

/** The mark from public/favicon.svg, inline so it takes the header's colours. */
export function Logo({ className = "size-5" }: Props) {
  return (
    <svg viewBox="0 0 36 36" role="img" aria-hidden className={className}>
      <rect width="36" height="36" rx="4" className="fill-foreground" />
      <path
        className="fill-background"
        d="M22.02 8H13.52C13.3 8 13.09 8.07 12.92 8.2C12.74 8.34 12.62 8.52 12.56 8.73L7.02 28.13C6.99 28.22 6.99 28.31 7.02 28.39C7.04 28.48 7.08 28.56 7.15 28.62C7.21 28.69 7.29 28.73 7.38 28.75C7.46 28.78 7.55 28.78 7.64 28.75L12.69 27.31C12.84 27.27 12.97 27.21 13.09 27.11C13.2 27.02 13.3 26.9 13.36 26.76L17.77 18L22.18 26.76C22.24 26.9 22.34 27.02 22.45 27.11C22.57 27.21 22.7 27.27 22.85 27.31L27.9 28.75C27.99 28.78 28.08 28.78 28.16 28.75C28.25 28.73 28.33 28.69 28.39 28.62C28.46 28.56 28.5 28.48 28.52 28.39C28.55 28.31 28.55 28.22 28.52 28.13L22.98 8.73C22.92 8.52 22.8 8.34 22.62 8.2C22.45 8.07 22.24 8 22.02 8Z"
      />
    </svg>
  );
}
