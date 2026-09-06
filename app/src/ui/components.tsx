import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

type Tone = 'primary' | 'amber' | 'danger' | 'neutral'

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border-default bg-surface-card shadow-sm ${className}`}>
      {title && (
        <h2 className="border-b border-border-default px-4 py-3 text-sm font-semibold text-text-title">
          {title}
        </h2>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

const toneText: Record<Tone, string> = {
  primary: 'text-primary-700',
  amber: 'text-accent-600',
  danger: 'text-danger-600',
  neutral: 'text-text-title',
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: Tone
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneText[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles: Record<string, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-500/50',
    outline: 'border border-border-default bg-surface-card text-text-body hover:bg-surface-card-subtle',
    danger: 'bg-danger-600 text-white hover:bg-danger-600/90',
    ghost: 'text-primary-700 hover:bg-primary-50',
  }
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-text-body focus:border-primary-500 focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-border-default bg-white px-3 py-2 text-sm text-text-body focus:border-primary-500 focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text-body">{label}</span>
      {children}
    </label>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const styles: Record<Tone, string> = {
    primary: 'bg-primary-100 text-primary-700',
    amber: 'bg-accent-50 text-accent-600',
    danger: 'bg-danger-50 text-danger-600',
    neutral: 'bg-surface-card-subtle text-text-muted',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  )
}

export function InsightBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border-l-4 border-accent-500 bg-accent-50 px-4 py-3 text-sm text-text-body">
      {children}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-hover bg-surface-card p-8 text-center">
      <p className="font-semibold text-text-title">{title}</p>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">{message}</p>
}

export function SuccessNote({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-700">{message}</p>
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface-card-subtle p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            active === tab.id ? 'bg-surface-card text-primary-700 shadow-sm' : 'text-text-muted hover:text-text-body'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
