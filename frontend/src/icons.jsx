// Small inline SVG icon set (no extra dependency).
const Svg = ({ children, size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="tf-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="13" fill="url(#tf-grad)" />
    <path
      d="M15 25l6.5 6.5L33.5 18.5"
      fill="none"
      stroke="#fff"
      strokeWidth="4.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckIcon = (p) => <Svg strokeWidth="3" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const XIcon = (p) => <Svg {...p}><path d="M18 6L6 18M6 6l12 12" /></Svg>;
export const SearchIcon = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>;
export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </Svg>
);
export const EditIcon = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </Svg>
);
export const LogOutIcon = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
);
export const UserIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></Svg>
);
export const LockIcon = (p) => (
  <Svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></Svg>
);
export const EyeIcon = (p) => (
  <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const EyeOffIcon = (p) => (
  <Svg {...p}>
    <path d="M17.94 17.94A10.5 10.5 0 0112 19c-6.5 0-10-7-10-7a18.4 18.4 0 015.06-5.94M9.9 4.24A9.6 9.6 0 0112 5c6.5 0 10 7 10 7a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M2 2l20 20" />
  </Svg>
);
export const AlertIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></Svg>
);
export const ListCheckIcon = (p) => (
  <Svg {...p}><rect x="3" y="4" width="6" height="6" rx="1.5" /><path d="M4.5 7l1 1 2-2M13 7h8M13 17h8" /><rect x="3" y="14" width="6" height="6" rx="1.5" /></Svg>
);
export const BellIcon = (p) => (
  <Svg {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></Svg>
);
export const BellOffIcon = (p) => (
  <Svg {...p}>
    <path d="M8.7 3A6 6 0 0118 8a21.3 21.3 0 00.6 5M17 17H3s3-2 3-9a4.67 4.67 0 01.3-1.7M10.3 21a1.94 1.94 0 003.4 0M2 2l20 20" />
  </Svg>
);
export const SparkleIcon = (p) => (
  <Svg {...p}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" /></Svg>
);
