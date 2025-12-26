import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    sourcemap: true, // 强制生成 Source Map
    minify: true,
  }
})
