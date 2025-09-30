import { ReactNode } from 'react';
import clsx from 'classnames';

type Variant = 'default' | 'success' | 'warning' | 'danger';

const styles: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger'
};

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: Variant }) {
  return <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', styles[variant])}>{children}</span>;
}
