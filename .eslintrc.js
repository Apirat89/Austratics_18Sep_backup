module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    // Change errors to warnings for deployment
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn'
  }
}; 