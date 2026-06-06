import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';
import { prependUseClient } from '../../scripts/prepend-use-client.mjs';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
  // esbuild strips a "use client" banner during bundling; restore it post-build.
  onSuccess: async () => {
    await prependUseClient(distDir);
  },
});
