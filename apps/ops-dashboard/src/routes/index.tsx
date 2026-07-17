import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getContext } from 'vinxi/http'
import * as React from 'react'

interface CloudflareContext {
    cloudflare: {
        env: import('../env').Env
    }
}

interface Workspace {
    id: string
    name: string
    projects?: { id: string, name: string }[]
    created_at?: string
}

const getWorkspaces = createServerFn({ method: 'GET' })
    .handler(async (): Promise<Workspace[]> => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB

            if (!db) {
                console.error("[getServerFn:getWorkspaces] D1 Database binding not found in process.env.")
                return []
            }

            const { results: workspaces } = await db.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all()
            const full = await Promise.all((workspaces as unknown as Workspace[]).map(async (ws) => {
                const { results: projects } = await db.prepare("SELECT id, name FROM projects WHERE workspace_id = ?").bind(ws.id).all()
                return { ...ws, projects: projects as { id: string, name: string }[] }
            }))
            return full
        } catch (error) {
            console.error('[getServerFn:getWorkspaces] Failed:', error)
            return []
        }
    })

const createWorkspace = createServerFn({ method: 'POST' })
    .inputValidator((data: { name: string, id?: string }) => data)
    .handler(async ({ data }) => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            const slug = data.id || data.name.toLowerCase().replace(/\s+/g, '-')
            await db.prepare("INSERT INTO workspaces (id, name) VALUES (?, ?)").bind(slug, data.name).run()
            return { success: true, id: slug }
        } catch (error) {
            console.error('[getServerFn:createWorkspace] Failed:', error)
            throw error
        }
    })

const createProject = createServerFn({ method: 'POST' })
    .inputValidator((data: { workspaceId: string, name: string, id?: string, description?: string }) => data)
    .handler(async ({ data }) => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            const slug = data.id || data.name.toLowerCase().replace(/\s+/g, '-')
            await db.prepare(
                "INSERT INTO projects (id, workspace_id, name, description) VALUES (?, ?, ?, ?)"
            ).bind(slug, data.workspaceId, data.name, data.description || null).run()
            return { success: true, id: slug }
        } catch (error) {
            console.error('[getServerFn:createProject] Failed:', error)
            throw error
        }
    })


export const Route = createFileRoute('/')({
    loader: () => getWorkspaces(),
    component: DashboardComponent
})

function DashboardComponent() {
    const workspaces = Route.useLoaderData()
    const router = useRouter()

    const [isCreating, setIsCreating] = React.useState(false)

    const handleCreateWorkspace = async () => {
        const name = prompt('Workspace Name:')
        if (!name) return
        setIsCreating(true)
        try {
            await createWorkspace({ data: { name } })
            router.invalidate()
        } catch (e) {
            alert('Failed to create workspace')
        } finally {
            setIsCreating(false)
        }
    }

    const handleAddProject = async (workspaceId: string) => {
        const name = prompt('Project Name:')
        if (!name) return
        setIsCreating(true)
        try {
            await createProject({ data: { workspaceId, name } })
            router.invalidate()
        } catch (e) {
            alert('Failed to create project')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="dashboard-content">
            <header>
                <h1>Empire Command Center</h1>
            </header>

            <div className="grid">
                <div className="pane">
                    <h2>Workspaces & Projects</h2>
                    <div className="list-container">
                        {workspaces.map((ws: Workspace) => (
                            <div key={ws.id} className="workspace-group" style={{ marginBottom: '16px' }}>
                                <div className="list-item" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>📁 <b>{ws.name}</b></span>
                                    <button
                                        className="ghost-btn"
                                        style={{ fontSize: '0.75rem' }}
                                        onClick={() => handleAddProject(ws.id)}
                                    >
                                        + Project
                                    </button>
                                </div>
                                <div className="project-list" style={{ paddingLeft: '24px' }}>
                                    {ws.projects?.map(p => (
                                        <div key={p.id} className="list-item sub" style={{ fontSize: '0.9rem' }}>
                                            🚀 {p.name}
                                        </div>
                                    ))}
                                    {(!ws.projects || ws.projects.length === 0) && (
                                        <div className="list-item text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                                            No projects yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {workspaces.length === 0 && <p className="text-muted">No workspaces found.</p>}
                    </div>
                </div>

                <div className="pane highlight">
                    <h2>Quick Actions</h2>
                    <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        <button
                            className="primary-btn"
                            onClick={handleCreateWorkspace}
                            disabled={isCreating}
                        >
                            {isCreating ? 'Creating...' : '+ New Workspace'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}


