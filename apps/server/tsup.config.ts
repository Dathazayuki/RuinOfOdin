import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  noExternal: ['@core-battle/shared'],
  outDir: 'dist',
  clean: true,
  sourcemap: false,
});
