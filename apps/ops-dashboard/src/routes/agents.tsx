import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'

interface Agent {
    id: string
    name: string
    description: string | null
    type: string
    workspace_id: string | null
    workspace_name?: string | null
    status: string
    config: string | null
    created_at?: string
}

interface Workspace {
    id: string
    name: string
}

// Server functions
const getAgents = createServerFn({ method: 'GET' })
    .handler(async (): Promise<Agent[]> => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            if (!db) {
                console.error("[getAgents] D1 Database binding not found.")
                return []
            }
            const { results } = await db.prepare(`
                SELECT a.*, w.name as workspace_name 
                FROM agents a 
                LEFT JOIN workspaces w ON a.workspace_id = w.id 
                ORDER BY a.created_at DESC
            `).all()
            return results as unknown as Agent[]
        } catch (error) {
            console.error('[getAgents] Failed:', error)
            return []
        }
    })

const getWorkspacesList = createServerFn({ method: 'GET' })
    .handler(async (): Promise<Workspace[]> => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            if (!db) return []
            const { results } = await db.prepare("SELECT id, name FROM workspaces ORDER BY name ASC").all()
            return results as unknown as Workspace[]
        } catch (error) {
            console.error('[getWorkspacesList] Failed:', error)
            return []
        }
    })

const saveAgent = createServerFn({ method: 'POST' })
    .inputValidator((data: { id: string, name: string, description?: string, type: string, workspace_id?: string, status: string, config: string }) => data)
    .handler(async ({ data }) => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            
            // Validate config is valid JSON
            try {
                JSON.parse(data.config)
            } catch (e) {
                throw new Error("Invalid JSON configuration")
            }

            await db.prepare(`
                INSERT INTO agents (id, name, description, type, workspace_id, status, config)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                type = excluded.type,
                workspace_id = excluded.workspace_id,
                status = excluded.status,
                config = excluded.config
            `).bind(
                data.id, 
                data.name, 
                data.description || null, 
                data.type, 
                data.workspace_id || null, 
                data.status, 
                data.config
            ).run()
            return { success: true }
        } catch (error) {
            console.error('[saveAgent] Failed:', error)
            throw error
        }
    })

const deleteAgent = createServerFn({ method: 'POST' })
    .inputValidator((data: { id: string }) => data)
    .handler(async ({ data }) => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            await db.prepare("DELETE FROM agents WHERE id = ?").bind(data.id).run()
            return { success: true }
        } catch (error) {
            console.error('[deleteAgent] Failed:', error)
            throw error
        }
    })

export const Route = createFileRoute('/agents')({
    loader: async () => {
        const [agents, workspaces] = await Promise.all([
            getAgents(),
            getWorkspacesList()
        ])
        return { agents, workspaces }
    },
    component: AgentsComponent
})

function AgentsComponent() {
    const { agents, workspaces } = Route.useLoaderData() as { agents: Agent[], workspaces: Workspace[] }
    const router = useRouter()

    const [selectedAgent, setSelectedAgent] = React.useState<Agent | null>(null)
    const [isEditing, setIsEditing] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    
    // Form states
    const [formId, setFormId] = React.useState('')
    const [formName, setFormName] = React.useState('')
    const [formDesc, setFormDesc] = React.useState('')
    const [formType, setFormType] = React.useState('ops')
    const [formWorkspace, setFormWorkspace] = React.useState('')
    const [formStatus, setFormStatus] = React.useState('active')
    const [formConfig, setFormConfig] = React.useState('{}')

    const startEdit = (agent: Agent) => {
        setSelectedAgent(agent)
        setFormId(agent.id)
        setFormName(agent.name)
        setFormDesc(agent.description || '')
        setFormType(agent.type)
        setFormWorkspace(agent.workspace_id || '')
        setFormStatus(agent.status)
        setFormConfig(agent.config ? JSON.stringify(JSON.parse(agent.config), null, 2) : '{}')
        setIsEditing(true)
    }

    const startCreate = () => {
        setSelectedAgent(null)
        setFormId('')
        setFormName('')
        setFormDesc('')
        setFormType('ops')
        setFormWorkspace('')
        setFormStatus('active')
        setFormConfig('{\n  "platforms": ["discord"],\n  "log_level": "info"\n}')
        setIsEditing(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formId || !formName) {
            alert('ID and Name are required!')
            return
        }

        // Validate JSON
        try {
            JSON.parse(formConfig)
        } catch (err) {
            alert('Config must be a valid JSON object!')
            return
        }

        setIsSaving(true)
        try {
            await saveAgent({
                data: {
                    id: formId,
                    name: formName,
                    description: formDesc,
                    type: formType,
                    workspace_id: formWorkspace || undefined,
                    status: formStatus,
                    config: formConfig
                }
            })
            setIsEditing(false)
            router.invalidate()
        } catch (err: any) {
            alert('Failed to save agent: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(`Are you sure you want to delete agent "${id}"?`)) return
        try {
            await deleteAgent({ data: { id } })
            setSelectedAgent(null)
            setIsEditing(false)
            router.invalidate()
        } catch (err) {
            alert('Failed to delete agent')
        }
    }

    return (
        <div className="agents-content">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Agent Management</h1>
                <button className="primary-btn" onClick={startCreate}>+ New Agent</button>
            </header>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
                {/* Left Side: Agent List */}
                <div className="pane scrolly">
                    <h2>🤖 Registered Agents</h2>
                    <div className="list-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        {agents.map(agent => (
                            <div 
                                key={agent.id} 
                                className={`list-item agent-card clickable ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                                style={{ 
                                    padding: '16px', 
                                    borderRadius: '16px', 
                                    border: '1px solid var(--border)',
                                    background: selectedAgent?.id === agent.id ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}
                                onClick={() => startEdit(agent)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{agent.name}</span>
                                    <span className={`status-badge ${agent.status}`} style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        background: agent.status === 'active' ? 'var(--success)' : agent.status === 'paused' ? '#eab308' : 'var(--danger)',
                                        color: '#fff',
                                        fontWeight: 'bold'
                                    }}>
                                        {agent.status.toUpperCase()}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: selectedAgent?.id === agent.id ? '#e0e7ff' : 'var(--text-muted)' }}>
                                    ID: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{agent.id}</code>
                                </span>
                                {agent.description && (
                                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>{agent.description}</p>
                                )}
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', opacity: 0.75, marginTop: '4px' }}>
                                    <span>🏷️ Type: <b>{agent.type}</b></span>
                                    {agent.workspace_name && (
                                        <span>📁 Workspace: <b>{agent.workspace_name}</b></span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {agents.length === 0 && <p className="text-muted">No agents registered.</p>}
                    </div>
                </div>

                {/* Right Side: Agent Details / Form */}
                <div className="pane">
                    {isEditing ? (
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h2>{selectedAgent ? `Edit ${selectedAgent.name}` : 'Create New Agent'}</h2>
                            
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Agent ID (Unique Slug)</label>
                                <input 
                                    type="text" 
                                    value={formId} 
                                    onChange={e => setFormId(e.target.value)} 
                                    placeholder="e.g. agent-seo-assistant"
                                    disabled={!!selectedAgent}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: 'white',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Agent Name</label>
                                <input 
                                    type="text" 
                                    value={formName} 
                                    onChange={e => setFormName(e.target.value)} 
                                    placeholder="e.g. SEO Assistant"
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: 'white',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Description</label>
                                <textarea 
                                    value={formDesc} 
                                    onChange={e => setFormDesc(e.target.value)} 
                                    placeholder="Describe what this agent does..."
                                    rows={2}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: 'white',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Type</label>
                                    <select 
                                        value={formType} 
                                        onChange={e => setFormType(e.target.value)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: '#1e293b',
                                            color: 'white',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        <option value="ops">Ops</option>
                                        <option value="growth">Growth</option>
                                        <option value="lifestyle">Lifestyle</option>
                                        <option value="executive">Executive</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Status</label>
                                    <select 
                                        value={formStatus} 
                                        onChange={e => setFormStatus(e.target.value)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: '#1e293b',
                                            color: 'white',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Assigned Workspace</label>
                                <select 
                                    value={formWorkspace} 
                                    onChange={e => setFormWorkspace(e.target.value)}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: '#1e293b',
                                        color: 'white',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    <option value="">None (Global / Unassigned)</option>
                                    {workspaces.map(ws => (
                                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>JSON Configuration</label>
                                <textarea 
                                    value={formConfig} 
                                    onChange={e => setFormConfig(e.target.value)} 
                                    rows={5}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(0,0,0,0.4)',
                                        color: '#cbd5e1',
                                        fontFamily: 'monospace',
                                        fontSize: '0.85rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                {selectedAgent && (
                                    <button 
                                        type="button" 
                                        className="danger-btn" 
                                        onClick={() => handleDelete(selectedAgent.id)}
                                        style={{
                                            background: 'var(--danger)',
                                            border: 'none',
                                            color: 'white',
                                            padding: '10px 20px',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                                <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditing(false)}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)',
                                            border: 'none',
                                            color: 'white',
                                            padding: '10px 20px',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="primary-btn"
                                        disabled={isSaving}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '10px'
                                        }}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Agent'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '3rem', marginBottom: '16px' }}>🤖</span>
                            <h3>Select an Agent to edit or configure</h3>
                            <p style={{ fontSize: '0.9rem' }}>Or click "+ New Agent" to register a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
