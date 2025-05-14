import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { string } from 'rollup-plugin-string';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

export default {
  input: 'src/ha-tbaro-card.ts',
  output: {
    file: 'dist/ha-tbaro-card.js',
    format: 'es'
  },
  plugins: [
    resolve(),
    json(), 
    typescript(),
    string({ include: '**/*.svg' }),
    terser() // ← minification ici

    
  ]
};