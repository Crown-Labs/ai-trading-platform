module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts(x)?$',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }],
  },
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@ai-trading/shared$': '<rootDir>/../../shared/src/index.ts',
  },
};
