import { ReactNode } from 'react';
import clsx from 'classnames';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-slate-900">{children}</h3>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-slate-600">{children}</p>;
}
