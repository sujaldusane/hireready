import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ label, hint, ...inputProps }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="password-input">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          aria-describedby={hint ? hintId : undefined}
          {...inputProps}
        />
        <button
          type="button"
          className="icon-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}