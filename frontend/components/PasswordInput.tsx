import { InputHTMLAttributes, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  // Passed straight to the <input> — kept distinct from the wrapper's own
  // (fixed) className so every caller keeps its exact existing input look
  // without needing to redeclare the toggle-button layout each time.
  inputClassName?: string;
}

// A plain type="password" input with a show/hide toggle — used everywhere
// a vendor types a password (login, change password, reset password) so
// they can double-check what they typed before submitting.
export default function PasswordInput({ inputClassName, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...rest} type={visible ? 'text' : 'password'} className={`${inputClassName || ''} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}
