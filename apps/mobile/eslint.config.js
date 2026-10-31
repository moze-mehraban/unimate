// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // In the monorepo the resolver doesn't find this app's tsconfig on its own,
    // so the "@/…" path alias would be reported as unresolved.
    settings: {
      'import/resolver': {
        // A relative path: the folder name contains glob characters ("(don't delete)").
        typescript: { project: 'tsconfig.json' },
      },
    },
  },
]);
