import { ReactNode } from 'react';

interface AlertProps {
  variant: 'success' | 'error' | 'info';
  children: ReactNode;
}

const STYLES: Record<AlertProps['variant'], string> = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

export default function Alert({ variant, children }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${STYLES[variant]}`} role="alert">
      {children}
    </div>
  );
}
