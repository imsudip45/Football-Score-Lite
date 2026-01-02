import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'out/**',
      'release/**',
      'electron/dist/**',
      '.next/**',
    ],
  },
]
