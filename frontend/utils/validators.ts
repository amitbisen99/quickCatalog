const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordCheck {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function checkPasswordStrength(password: string): PasswordCheck {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const check = checkPasswordStrength(password);
  return check.minLength && check.hasUppercase && check.hasNumber && check.hasSpecialChar;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
