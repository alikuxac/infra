import { createRootRoute } from '@tanstack/react-router'
import { Outlet, ScrollRestoration, HeadContent, Scripts } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'Alikuxac Empire | Command Center' }
        ],
        links: [
            { rel: 'stylesheet', href: '/src/index.css' }
        ]
    }),
    component: RootComponent
})

function RootComponent() {
    return (
        <RootDocument>
            <div className="app-container">
                <aside className="sidebar">
                    <div className="logo">Alikuxac Empire</div>
                    <nav className="nav-links">
                        <a href="/" className="nav-link">🏙️ Workspaces</a>
                        <a href="/agents" className="nav-link">🤖 Agents</a>
                        <a href="/mapping" className="nav-link">🔗 Mapping</a>
                        <a href="/usage" className="nav-link">📊 Usage</a>
                    </nav>
                </aside>
                <main className="content">
                    <Outlet />
                </main>
            </div>
        </RootDocument>
    )
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    )
}
