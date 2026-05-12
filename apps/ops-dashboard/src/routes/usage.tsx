import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'

interface UsageData {
    module: string
    persona: string | null
    tokens: number
}

const getUsageData = createServerFn({ method: "GET" })
    .handler(async (): Promise<UsageData[]> => {
        try {
            const env = process.env as unknown as any
            const db: D1Database = env.DB

            const { results } = await db.prepare(
                "SELECT module, persona, SUM(total_tokens) as tokens FROM usage_logs GROUP BY module, persona ORDER BY tokens DESC LIMIT 20"
            ).all()

            return results as unknown as UsageData[]
        } catch (error) {
            console.error('[getServerFn:getUsageData] Failed:', error)
            return []
        }
    })

export const Route = createFileRoute()({

    loader: () => getUsageData(),
    component: UsageComponent
})

function UsageComponent() {
    const usage = Route.useLoaderData() as any as UsageData[]


    return (
        <div className="usage-content">
            <header>
                <h1>Usage Analytics</h1>
            </header>

            <div className="pane">
                <h2>Consumption by Agent / Module</h2>
                <table className="usage-table">
                    <thead>
                        <tr>
                            <th>Module</th>
                            <th>Persona</th>
                            <th>Total Tokens</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usage.map((u, idx) => (
                            <tr key={idx}>
                                <td>{u.module}</td>
                                <td><span className="persona-badge">{u.persona || 'SYSTEM'}</span></td>
                                <td className="tokens">{u.tokens.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {usage.length === 0 && <div className="empty-state">No usage data found</div>}
            </div>
        </div>
    )
}
