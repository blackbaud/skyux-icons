import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';

import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

import workspace from './eslint.config.workspace.mjs';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  ...workspace,
  prettier,
]);
