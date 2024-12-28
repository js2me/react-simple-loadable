module.exports = {
  extends: [require.resolve('js2me-eslint-config/react')],
  settings: {
    'import/resolver': {
      typescript: {
        project: require.resolve('./tsconfig.json'),
      },
    },
  },
  rules: {
    'unicorn/prevent-abbreviations': 'off',
    'sonarjs/no-unsafe': 'off',
    'sonarjs/public-static-readonly': 'off'
  }
};
