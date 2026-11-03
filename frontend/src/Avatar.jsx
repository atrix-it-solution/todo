const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#ef4444", "#14b8a6"];

export const colorFor = (name = "") => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

export const displayName = (name = "") => name.charAt(0).toUpperCase() + name.slice(1);

export default function Avatar({ name = "?", size = 28 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.45, background: colorFor(name) }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
