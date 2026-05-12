import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter(): any {
    const router = createTanStackRouter({
        routeTree: routeTree as any,
        defaultPreload: 'intent'
    })

    return router
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof createRouter>
    }
}
