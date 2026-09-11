import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  const variants: Record<string, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Label({ className = '', ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-sm font-medium text-slate-700 mb-1 ${className}`} {...props} />;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', ...props }: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${className}`}
      {...(props as any)}
    />
  );
}

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: 'slate' | 'green' | 'orange' | 'red' }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-2xl">
        📭
      </div>
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
