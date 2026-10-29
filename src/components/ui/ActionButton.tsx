import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** True while the action is in flight. */
  loading?: boolean
  /**
   * Label to show while loading. When omitted the original children stay put
   * and only the spinner is added, so the button does not jump.
   */
  loadingLabel?: ReactNode
  children: ReactNode
}

/**
 * A button that can show that it is working.
 *
 * Almost every mutation in the app used to look identical before and after
 * the click — a destructive erase and a slow network upload both painted the
 * same picture a frame later, so there was no way to tell whether the click
 * had registered. This component gives every mutation the same pending
 * affordance: a pixel spinner plus `aria-busy` for assistive tech.
 */
export default function ActionButton({
  loading = false,
  loadingLabel,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ActionButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={className}
    >
      {loading && <span className="pixel-spinner mr-1.5" aria-hidden="true" />}
      {loading && loadingLabel !== undefined ? loadingLabel : children}
    </button>
  )
}
