import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
    plugins: [
        cloudflare({
            viteEnvironment: {
                name: 'ssr'
            }
        }),
        tanstackStart()
    ]
})
