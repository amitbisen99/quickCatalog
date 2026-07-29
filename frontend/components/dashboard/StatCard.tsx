import { ComponentType, SVGProps } from 'react';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: 'primary' | 'secondary' | 'green' | 'gray';
}

const BADGE_CLASSES: Record<NonNullable<Props['accent']>, string> = {
  primary: 'bg-primary-100 text-primary-700',
  secondary: 'bg-secondary-100 text-secondary-700',
  green: 'bg-green-100 text-green-700',
  gray: 'bg-gray-100 text-gray-600',
};

export default function StatCard({ label, value, hint, icon: Icon, accent = 'primary' }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${BADGE_CLASSES[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
