/**
 * Dev-only config for the local component playground (`pnpm playground`).
 * Not part of the published package — the library itself is built with tsup.
 *
 * Exported as a plain object (no `defineConfig` import) so it loads even though
 * `vite` is hoisted to the workspace root rather than this package.
 *
 * The source uses TypeScript's `.js` import specifiers (e.g. `./theme.js`),
 * which point at `.ts`/`.tsx` files on disk. The plugin below remaps them so
 * Vite can serve the source directly with hot-reload.
 */
export default {
  root: 'playground',
  server: {
    port: 5174,
    host: true,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**'],
    },
  },
  watch: {
    usePolling: true,
    interval: 1000,
    ignored: ['**/node_modules/**'],
  },
  esbuild: { jsx: 'automatic' as const },
  plugins: [
    {
      name: 'resolve-ts-from-js-specifier',
      enforce: 'pre' as const,
      async resolveId(
        this: {
          resolve: (
            s: string,
            i: string,
            o: { skipSelf: boolean },
          ) => Promise<{ id: string } | null>;
        },
        source: string,
        importer: string | undefined,
      ) {
        if (!importer || !/^\.{1,2}\//.test(source) || !source.endsWith('.js')) return null;
        // Only remap imports between the library's own source files — never
        // touch Vite's pre-bundled deps (node_modules/.vite/deps/*.js chunks).
        if (importer.includes('node_modules')) return null;
        for (const ext of ['.tsx', '.ts']) {
          const candidate = source.replace(/\.js$/, ext);
          const resolved = await this.resolve(candidate, importer, { skipSelf: true });
          if (resolved) return resolved;
        }
        return null;
      },
    },
  ],
};
