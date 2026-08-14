interface Props {
  percent: number;
  className?: string;
}

export default function ProgressBar({ percent, className = '' }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
      <div
        className="h-full rounded-full bg-primary-700 transition-all duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
