import { checkPasswordStrength, PasswordCheck } from '@/utils/validators';

interface Props {
  password: string;
}

const RULES: { key: keyof PasswordCheck; label: string }[] = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUppercase', label: 'One uppercase letter' },
  { key: 'hasNumber', label: 'One number' },
  { key: 'hasSpecialChar', label: 'One special character' },
];

export default function PasswordStrengthMeter({ password }: Props) {
  const check = checkPasswordStrength(password);
  const passedCount = Object.values(check).filter(Boolean).length;

  const barColor =
    passedCount <= 1 ? 'bg-red-500' : passedCount <= 3 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="mt-2 space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${(passedCount / RULES.length) * 100}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {RULES.map((rule) => (
          <li key={rule.key} className={check[rule.key] ? 'text-green-600' : 'text-gray-400'}>
            {check[rule.key] ? '✓' : '○'} {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
