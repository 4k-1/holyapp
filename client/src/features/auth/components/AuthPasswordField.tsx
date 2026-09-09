import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons/AdminIcons";
import "@/features/auth/styles/authDesk.css";

type AuthPasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export function AuthPasswordField({
  id,
  label,
  className = "",
  disabled,
  ...props
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="auth-desk__label">
          {label}
        </label>
      ) : null}
      <div className="auth-desk__password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={`auth-desk__input auth-desk__input--password ${className}`}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          className="auth-desk__password-toggle"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOffIcon className="h-4 w-4" aria-hidden />
          ) : (
            <EyeIcon className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
