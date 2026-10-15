import { readFileSync } from 'node:fs'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

export default {
  input: 'src/play-plugin.ts',
  output: [
    { file: pkg.main, name: 'svguitarPlayPlugin', format: 'umd', exports: 'named', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true },
  ],
  // Never bundle svguitar, it is provided by the user (peer dependency)
  external: [...Object.keys(pkg.peerDependencies ?? {})],
  watch: {
    include: 'src/**',
  },
  plugins: [typescript({ tsconfig: './tsconfig.build.json' }), commonjs(), resolve()],
}
