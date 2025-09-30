import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';
import clsx from 'classnames';
import { Slot } from '@radix-ui/react-slot';

type Variant = 'default' | 'outline';

type Props = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: Variant;
  asChild?: boolean;
};

export function Button({ className, variant = 'default', asChild, type = 'button', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition';
  const variants: Record<Variant, string> = {
    default: 'bg-primary text-white hover:bg-primary/90',
    outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
  };

  const Comp = asChild ? Slot : 'button';

  return <Comp className={clsx(base, variants[variant], className)} type={asChild ? undefined : type} {...rest} />;
}
