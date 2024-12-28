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
    'unicorn/prevent-abbreviations': 'off'
  }
};
