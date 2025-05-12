import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/ha-tbaro-card.ts',
  output: {
    file: 'dist/ha-tbaro-card.js',
    format: 'es'
  },
  plugins: [
    resolve(),
    typescript(),
    
  ]
};