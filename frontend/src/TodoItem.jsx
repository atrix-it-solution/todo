import { useState } from "react";
import { CheckIcon, EditIcon, TrashIcon } from "./icons.jsx";
import Avatar, { displayName } from "./Avatar.jsx";

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

function EditRow({ todo, isAdmin, users, onSave, onCancel }) {
  const [text, setText] = useState(todo.title);
  const [assignee, setAssignee] = useState(todo.assigned_to ?? "");
  const save = () => text.trim() && onSave(text.trim(), assignee === "" ? null : Number(assignee));

  return (
    <li className="item editing">
      <input
        className="edit-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
        maxLength={200}
        aria-label="Edit task"
        autoFocus
      />
      {isAdmin && (
        <label className="assign-field">
          <span>Assign to</span>
          <select className="select" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Nobody</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u.username)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="edit-actions">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!text.trim()}>
          Save
        </button>
      </div>
    </li>
  );
}

export default function TodoItem({
  todo,
  me,
  users,
  canManage,
  selectMode,
  selected,
  onSelect,
  onToggle,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  const isAdmin = me.role === "admin";

  if (editing) {
    return <EditRow todo={todo} isAdmin={isAdmin} users={users} onSave={onSave} onCancel={onCancel} />;
  }

  const pending = Boolean(todo.pending);
  const selectable = selectMode && canManage && !pending;
  const classes = [
    "item",
    todo.completed && "done",
    pending && "pending",
    selectable && "selectable",
    selectMode && !selectable && "locked",
    selectMode && selected && "selected",
  ]
    .filter(Boolean)
    .join(" ");

  // Who is this about? Admin sees the assignee; employees see who gave them the task.
  let person = null;
  if (isAdmin) {
    person = todo.assignee_name
      ? { name: todo.assignee_name, label: todo.assigned_to === me.id ? "Me" : displayName(todo.assignee_name) }
      : { name: "", label: "Unassigned" };
  } else if (todo.created_by !== me.id && todo.creator_name) {
    person = { name: todo.creator_name, label: `From ${displayName(todo.creator_name)}` };
  }

  return (
    <li className={classes} onClick={selectable ? onSelect : undefined}>
      {selectMode ? (
        <button
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select "${todo.title}"`}
          className={`box ${selected ? "on" : ""}`}
          disabled={!selectable}
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

      <div className="item-body" onDoubleClick={selectMode || pending || !canManage ? undefined : onStartEdit}>
        <span className="item-title">{todo.title}</span>
        <span className="item-meta">
          {person && (
            <span className={`chip ${person.name ? "" : "muted"}`}>
              {person.name && <Avatar name={person.name} size={16} />}
              {person.label}
            </span>
          )}
          <span>
            {pending
              ? "Saving…"
              : `${todo.completed ? "Completed" : "Created"} · ${timeAgo(todo.completed ? todo.updated_at : todo.created_at)}`}
          </span>
        </span>
      </div>

      {!selectMode && canManage && (
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
