import { html } from "hono/html";
import { DashboardStats } from "../services/core/dashboard-service.js";

export const renderDashboard = (stats: DashboardStats, css: string) => html`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alikuxac Executive Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>${css}</style>
  </head>
  <body>
    <div class="container">
      <header>
        <div>
          <h1>Ops AI Empire</h1>
          <p class="card-subtext">Executive Terminal for alikuxac.xyz</p>
        </div>
        <div class="status-badge">
          <div class="status-dot"></div>
          System ${stats.systemState.toUpperCase()}
        </div>
      </header>

      <div class="grid">
        <!-- Neurons Card -->
        <div class="card">
          <div class="card-title">Neuronal Energy</div>
          <div class="card-value">${stats.totalNeurons.toLocaleString()}</div>
          <div class="card-subtext">Total tokens processed across all neurons</div>
        </div>

        <!-- Memory Card -->
        <div class="card">
          <div class="card-title">Synaptic Memory</div>
          <div class="card-value">${stats.memoryUsage.facts}</div>
          <div class="card-subtext">Relational facts stored in D1 / Second Brain</div>
        </div>

        <!-- Agents Card -->
        <div class="card">
          <div class="card-title">Active Sub-Agents</div>
          <div class="agent-list">
            ${stats.activeAgents.map(agent => html`<span class="agent-tag">${agent}</span>`)}
          </div>
          <div class="card-subtext">Agents ready for delegation</div>
        </div>

        <!-- Recent Activity Logs -->
        <div class="card logs-card">
          <div class="card-title">Audit Trail & System Logs</div>
          ${stats.recentLogs.length > 0 ? stats.recentLogs.map(log => html`
            <div class="log-item">
              <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
              <span class="log-level level-${log.level.toLowerCase()}">[${log.level}]</span>
              <span class="log-message">${log.message}</span>
            </div>
          `) : html`<p class="card-subtext">No logs found in the last cycle.</p>`}
        </div>
      </div>
    </div>
  </body>
  </html>
`;
