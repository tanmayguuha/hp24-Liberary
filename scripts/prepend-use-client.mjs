// Prepends the "use client" directive to bundled JS outputs.
// esbuild strips module-level "use client" directives during bundling (and warns),
// so a tsup `banner` doesn't survive. This restores it post-build for packages
// shipping React client components, so they work in Next.js App Router.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIRECTIVE = '"use client";\n';

/** Prepend the directive to every bundled JS file in `distDir`. */
export async function prependUseClient(distDir) {
  const files = await readdir(distDir);
  let patched = 0;
  for (const file of files) {
    if (!/\.(js|cjs|mjs)$/.test(file)) continue;
    const path = join(distDir, file);
    const code = await readFile(path, 'utf8');
    if (code.startsWith('"use client"') || code.startsWith("'use client'")) continue;
    await writeFile(path, DIRECTIVE + code);
    patched++;
  }
  console.log(`prepend-use-client: patched ${patched} file(s) in ${distDir}`);
}
