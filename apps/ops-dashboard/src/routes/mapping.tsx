import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { DiscordClient, DiscordChannelType } from '@alikuxac/discord-core'
import * as React from 'react'
import { z } from 'zod'


interface DiscordCategoryHierarchy {
    id: string
    name: string
    channels: import('@alikuxac/discord-core').DiscordChannel[]
}

interface DiscordGuildHierarchy {
    id: string
    name: string
    categories: DiscordCategoryHierarchy[]
}

interface ContextMapping {
    platform: string
    external_id: string
    internal_type: 'workspace' | 'project'
    internal_id: string
}

interface InternalProject {
    id: string
    name: string
    workspace_id: string
}

interface WorkspaceWithProjects {
    id: string
    name: string
    projects: InternalProject[]
}

const getDiscordHierarchy = createServerFn({ method: 'GET' })
    .handler(async (): Promise<DiscordGuildHierarchy[]> => {
        try {
            const env = process.env as unknown as any
            const client = new DiscordClient(env.DISCORD_BOT_TOKEN)


            // Using any to bypass potential library linking issues in tsc
            const guilds = await (client as any).getGuilds()
            const tree = await Promise.all((guilds as any[]).map(async (g) => {
                const channels = await (client as any).getGuildChannels(g.id)
                const categories = (channels as any[])
                    .filter(ch => ch.type === DiscordChannelType.GUILD_CATEGORY)
                    .map(cat => ({
                        id: cat.id,
                        name: cat.name ?? 'Unknown Category',
                        channels: (channels as any[]).filter(ch =>
                            ch.parent_id === cat.id &&
                            (ch.type === DiscordChannelType.GUILD_TEXT || ch.type === DiscordChannelType.GUILD_FORUM || ch.type === DiscordChannelType.GUILD_ANNOUNCEMENT)
                        )
                    }))
                return { id: g.id, name: g.name, categories }
            }))

            return tree
        } catch (error) {
            console.error('[getServerFn:getDiscordHierarchy] Failed:', error)
            throw error
        }
    })

const getInternalTargets = createServerFn({ method: 'GET' })
    .handler(async (): Promise<WorkspaceWithProjects[]> => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            const { results: workspaces } = await db.prepare("SELECT * FROM workspaces").all()


            const full = await Promise.all((workspaces as unknown as { id: string, name: string }[]).map(async (ws) => {
                const { results: projects } = await db.prepare("SELECT * FROM projects WHERE workspace_id = ?").bind(ws.id).all()

                return {
                    ...ws,
                    projects: projects as unknown as InternalProject[]
                }
            }))
            return full
        } catch (error) {
            console.error('[getServerFn:getInternalTargets] Failed:', error)
            throw error
        }
    })

const getExistingMappings = createServerFn({ method: 'GET' })
    .handler(async (): Promise<ContextMapping[]> => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            const { results } = await db.prepare("SELECT * FROM context_mappings").all()
            return results as unknown as ContextMapping[]

        } catch (error) {
            console.error('[getServerFn:getExistingMappings] Failed:', error)
            return []
        }
    })

const saveMappingSchema = z.object({
    platform: z.string(),
    externalId: z.string(),
    internalType: z.enum(['workspace', 'project']),
    internalId: z.string()
})

const saveMapping = createServerFn({ method: 'POST' })
    .handler(async ({ data }: { data: any }) => {
        try {
            const validated = saveMappingSchema.parse(data)
            const env = process.env as unknown as any
            const db: D1Database = env.DB
            await db.prepare(

                `INSERT INTO context_mappings (platform, external_id, internal_type, internal_id) 
                 VALUES (?, ?, ?, ?) 
                 ON CONFLICT(platform, external_id) DO UPDATE SET 
                 internal_type = excluded.internal_type, 
                 internal_id = excluded.internal_id`
            ).bind(validated.platform, validated.externalId, validated.internalType, validated.internalId).run()
            return { success: true }
        } catch (error) {
            console.error('[getServerFn:saveMapping] Failed:', error)
            throw error
        }
    })


export const Route = createFileRoute('/mapping')({
    loader: async () => {
        const [discord, internal, mappings] = await Promise.all([
            getDiscordHierarchy(),
            getInternalTargets(),
            getExistingMappings()
        ])
        return { discord, internal, mappings }
    },
    component: MappingComponent
})


function MappingComponent() {
    const { discord, internal, mappings } = Route.useLoaderData() as any as {
        discord: DiscordGuildHierarchy[],
        internal: WorkspaceWithProjects[],
        mappings: ContextMapping[]
    }

    const router = useRouter()

    const [selectedDiscord, setSelectedDiscord] = React.useState<{ id: string, name: string, type: 'category' | 'channel' } | null>(null)
    const [selectedInternal, setSelectedInternal] = React.useState<{ id: string, name: string, type: 'workspace' | 'project' } | null>(null)
    const [isSaving, setIsSaving] = React.useState(false)

    const isValid = React.useMemo(() => {
        if (!selectedDiscord || !selectedInternal) return false
        if (selectedInternal.type === 'workspace' && selectedDiscord.type !== 'category') return false
        if (selectedInternal.type === 'project' && selectedDiscord.type !== 'channel') return false
        return true
    }, [selectedDiscord, selectedInternal])

    const handleMap = async () => {
        if (!isValid || !selectedDiscord || !selectedInternal) return

        setIsSaving(true)
        try {
            await (saveMapping as any)({
                data: {
                    platform: 'discord',
                    externalId: selectedDiscord.id,
                    internalType: selectedInternal.type,
                    internalId: selectedInternal.id
                }
            })
            setSelectedDiscord(null)
            setSelectedInternal(null)
            router.invalidate()
        } catch (error) {
            alert('Failed to save mapping. Check console.')
        } finally {
            setIsSaving(false)
        }
    }

    const getMappedTo = (externalId: string) => {
        const mapping = (mappings as ContextMapping[]).find(m => m.external_id === externalId)
        if (!mapping) return null
        return mapping
    }

    return (
        <div className="mapping-content">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Context Mapping</h1>
                <div className="selection-status" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {selectedDiscord && <span>Selected: <b style={{ color: 'var(--primary)' }}>{selectedDiscord.name}</b></span>}
                    {selectedDiscord && selectedInternal && <span> ➡️ </span>}
                    {selectedInternal && <span>Target: <b style={{ color: 'var(--success)' }}>{selectedInternal.name}</b></span>}

                    {isValid && (
                        <button
                            className="primary-btn"
                            onClick={handleMap}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Link Now'}
                        </button>
                    )}

                    {selectedDiscord && selectedInternal && !isValid && (
                        <span style={{ color: '#ff4d4f', fontSize: '0.85rem' }}>
                            {selectedInternal.type === 'workspace' ? 'Need Category' : 'Need Channel'}
                        </span>
                    )}

                    {!selectedDiscord && !selectedInternal && <span style={{ color: 'var(--text-muted)' }}>Select from both sides to map</span>}
                </div>
            </header>

            <div className="grid">
                <div className="pane scrolly">
                    <h2>🌐 Discord Hierarchy</h2>
                    <div className="list-container">
                        {discord.map(g => (
                            <div key={g.id}>
                                <div className="list-item server">🛡️ {g.name}</div>
                                {g.categories.map(cat => {
                                    const mapped = getMappedTo(cat.id)
                                    return (
                                        <div key={cat.id} style={{ paddingLeft: '16px' }}>
                                            <div
                                                className={`category-label clickable ${selectedDiscord?.id === cat.id ? 'selected' : ''}`}
                                                onClick={() => setSelectedDiscord({ id: cat.id, name: cat.name, type: 'category' })}
                                            >
                                                📁 {cat.name}
                                                {mapped && <span className="mapping-badge">{mapped.internal_id}</span>}
                                            </div>
                                            {cat.channels.map(ch => {
                                                const chMapped = getMappedTo(ch.id)
                                                // 15 = Forum
                                                const icon = ch.type === 15 ? '📝' : '#';
                                                return (
                                                    <div
                                                        key={ch.id}
                                                        className={`list-item channel clickable ${selectedDiscord?.id === ch.id ? 'selected' : ''}`}
                                                        onClick={() => setSelectedDiscord({ id: ch.id, name: ch.name ?? 'Unknown', type: 'channel' })}
                                                    >
                                                        {icon} {ch.name}
                                                        {chMapped && <span className="mapping-badge">{chMapped.internal_id}</span>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pane scrolly">
                    <h2>🏗️ Internal Targets</h2>
                    <div className="list-container">
                        {internal.map(ws => (
                            <div key={ws.id}>
                                <div
                                    className={`list-item workspace clickable ${selectedInternal?.id === ws.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedInternal({ id: ws.id, name: ws.name, type: 'workspace' })}
                                >
                                    📁 {ws.name}
                                </div>
                                {ws.projects.map(p => (
                                    <div
                                        key={p.id}
                                        className={`list-item project clickable ${selectedInternal?.id === p.id ? 'selected' : ''}`}
                                        style={{ paddingLeft: '32px' }}
                                        onClick={() => setSelectedInternal({ id: p.id, name: p.name, type: 'project' })}
                                    >
                                        🚀 {p.name}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
