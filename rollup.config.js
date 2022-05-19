export default {
  input: {
    content: './src/content.js',
    background: './src/background.js',
    index: './src/index.js',
  },
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  watch: {
    include: 'src/**',
  },
}
