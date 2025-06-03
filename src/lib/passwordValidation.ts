export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Maximum length check (prevent DoS attacks)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Common password patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /letmein/i,
    /welcome/i,
    /admin/i,
    /test/i
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns and is not secure');
      score -= 1;
      break;
    }
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
    score -= 1;
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4 && errors.length === 0) {
    strength = 'strong';
  } else if (score >= 2 && errors.length <= 2) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.max(0, score)
  };
}

// Email validation with more comprehensive checks
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Length checks
  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  // Local part length check
  const [localPart] = email.split('@');
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email local part is too long' };
  }

  // Disposable email domains (basic list)
  const disposableDomains = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email'
  ];

  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { isValid: false, error: 'Disposable email addresses are not allowed' };
  }

  return { isValid: true };
}

// Rate limiting helper (basic implementation)
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

const attemptTracker = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const existing = attemptTracker.get(identifier);

  if (!existing || now > existing.resetTime) {
    // Reset or create new entry
    attemptTracker.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
  }

  if (existing.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: existing.resetTime };
  }

  existing.count++;
  return { 
    allowed: true, 
    remaining: maxAttempts - existing.count, 
    resetTime: existing.resetTime 
  };
} 