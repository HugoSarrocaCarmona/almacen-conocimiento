// Iconos de trazo sencillos (sin dependencias externas).
const PATHS = {
  library: 'M4 5h4v14H4zM10 5h4v14h-4zM16.5 5.5l3.5-.9 3 13.6-3.5.9z',
  review: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2',
  data: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  plus: 'M12 5v14M5 12h14',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20',
  filter: 'M4 6h16M7 12h10M10 18h4',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.5M17 4l3 3-3 3M17 14l3 3-3 3M13 9.5C14 8 15 7 17 7h3',
  paste: 'M9 4h6v3H9zM8 5H5v15h14V5h-3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  upload: 'M12 15V3M7 8l5-5 5 5M4 19h16',
  share: 'M12 3v12M8 7l4-4 4 4M6 11H4v10h16V11h-2',
  folder: 'M3 6h6l2 2h10v11H3z',
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
