import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('dist/public');
fs.mkdirSync(outDir, { recursive: true });

// Copy static PWA files from public/
const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  for (const file of fs.readdirSync(publicDir)) {
    fs.copyFileSync(path.join(publicDir, file), path.join(outDir, file));
  }
}

await esbuild.build({
  entryPoints: ['src/client/main.tsx'],
  bundle: true,
  outfile: 'dist/public/app.js',
  format: 'esm',
  target: ['es2020'],
  minify: false,
  sourcemap: true,
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});

console.log('✓ Client PWA bundle built in dist/public/app.js');
