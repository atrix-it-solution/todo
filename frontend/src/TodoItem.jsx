import { CheckIcon, EditIcon, TrashIcon } from "./icons.jsx";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function TodoItem({
  todo,
  selectMode,
  selected,
  onSelect,
  onToggle,
  editing,
  editText,
  onEditText,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  if (editing) {
    return (
      <li className="item editing">
        <input
          className="edit-input"
          value={editText}
          onChange={(e) => onEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onCancel();
          }}
          maxLength={200}
          aria-label="Edit task"
          autoFocus
        />
        <div className="edit-actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={!editText.trim()}>
            Save
          </button>
        </div>
      </li>
    );
  }

  const pending = Boolean(todo.pending);
  const classes = [
    "item",
    todo.completed && "done",
    pending && "pending",
    selectMode && !pending && "selectable",
    selectMode && selected && "selected",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={classes} onClick={selectMode ? onSelect : undefined}>
      {selectMode ? (
        <button
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select "${todo.title}"`}
          className={`box ${selected ? "on" : ""}`}
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <CheckIcon size={14} />
        </button>
      ) : (
        <button
          role="checkbox"
          aria-checked={todo.completed}
          aria-label={todo.completed ? "Mark as not done" : "Mark as done"}
          className={`circle ${todo.completed ? "on" : ""}`}
          disabled={pending}
          onClick={onToggle}
        >
          <CheckIcon size={14} />
        </button>
      )}

      <div className="item-body" onDoubleClick={selectMode || pending ? undefined : onStartEdit}>
        <span className="item-title">{todo.title}</span>
        <span className="item-meta">
          {pending
            ? "Saving…"
            : `${todo.completed ? "Completed" : "Created"} · ${timeAgo(todo.completed ? todo.updated_at : todo.created_at)}`}
        </span>
      </div>

      {!selectMode && (
        <div className="item-actions">
          <button className="icon-btn" onClick={onStartEdit} disabled={pending} aria-label="Edit task" title="Edit">
            <EditIcon size={18} />
          </button>
          <button className="icon-btn danger" onClick={onDelete} disabled={pending} aria-label="Delete task" title="Delete">
            <TrashIcon size={18} />
          </button>
        </div>
      )}
    </li>
  );
}
