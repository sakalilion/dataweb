import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const profile = {
  id: "dataweb",
  name: "Dataweb AI Pro",
  version: "3.1.0",
  tagline: "Signal intelligence for research teams",
  description: "A focused MCP and A2A agent for market context, structured analysis, and fast operational answers.",
  heroLabel: "Research Profile",
  author: "dataweb",
  theme: {
    page: "#08111d",
    panel: "rgba(9, 18, 32, 0.82)",
    panelEdge: "rgba(245, 158, 11, 0.24)",
    accent: "#d97706",
    accentSoft: "#fbbf24",
    glow: "rgba(217, 119, 6, 0.22)"
  },
  agents: {
    analyst: (task) => `Analyst mapped the signal structure for ${task}.`,
    strategist: (task) => `Strategist assembled a plan around ${task}.`,
    executor: (task) => `Executor prepared the next action for ${task}.`
  },
  tools: [
    {
      name: "chat",
      description: "Answer a research question in plain language.",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Research question or prompt" }
        },
        required: ["message"]
      }
    },
    {
      name: "analyze",
      description: "Turn notes or data into a structured analysis.",
      inputSchema: {
        type: "object",
        properties: {
          data: { type: "string", description: "Topic, dataset, or notes" }
        },
        required: ["data"]
      }
    },
    {
      name: "predict",
      description: "Produce a directional forecast and confidence note.",
      inputSchema: {
        type: "object",
        properties: {
          data: { type: "string", description: "Signal input for prediction" }
        },
        required: ["data"]
      }
    },
    {
      name: "classify",
      description: "Classify text into a broad topic bucket.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to classify" }
        },
        required: ["text"]
      }
    },
    {
      name: "generate",
      description: "Generate a draft response from a prompt.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Prompt to generate from" }
        },
        required: ["prompt"]
      }
    },
    {
      name: "multi_agent",
      description: "Run the analyst, strategist, and executor chain.",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "Task to coordinate" }
        },
        required: ["task"]
      }
    }
  ],
  prompts: [
    {
      name: "crypto_analysis",
      description: "Build a structured crypto market analysis prompt.",
      arguments: [
        { name: "asset", description: "Asset, sector, or watchlist segment", required: false }
      ]
    },
    {
      name: "ai_strategy",
      description: "Build a prompt for AI automation strategy work.",
      arguments: [
        { name: "goal", description: "Business or product goal", required: false }
      ]
    }
  ],
  skills: [
    { name: "market_research", description: "Research market structure, trend context, and positioning." },
    { name: "crypto_analysis", description: "Build a structured crypto market analysis prompt." },
    { name: "ai_strategy", description: "Build a prompt for AI automation strategy work." },
    { name: "signal_scoring", description: "Score incoming signals by strength, risk, and timing." },
    { name: "narrative_mapping", description: "Map narratives, catalysts, and crowd attention shifts." },
    { name: "catalyst_tracking", description: "Track events that can move sentiment or price." },
    { name: "competitor_scan", description: "Compare projects, categories, or market leaders quickly." },
    { name: "thesis_builder", description: "Turn rough ideas into an investment or research thesis." },
    { name: "macro_brief", description: "Summarize macro conditions affecting crypto markets." },
    { name: "token_compare", description: "Compare two or more assets across key decision factors." },
    { name: "portfolio_watch", description: "Monitor portfolio themes and surface notable changes." },
    { name: "risk_digest", description: "Produce a concise downside-risk and invalidation brief." },
    { name: "memo_writer", description: "Write polished research notes and internal summaries." }
  ],
  resources: [
    {
      uri: "resource://dataweb/market-data",
      name: "market_data",
      description: "Snapshot of mock signal-led market movers.",
      mimeType: "application/json"
    },
    {
      uri: "resource://dataweb/memory",
      name: "memory",
      description: "Session memory for the Dataweb profile.",
      mimeType: "application/json"
    }
  ]
};

const memory = {};

function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  return `${protocol}://${req.get("host")}`;
}

function getSessionId(req) {
  return req.headers["x-session-id"] || "default";
}

function ensureSession(sessionId) {
  if (!memory[sessionId]) {
    memory[sessionId] = [];
  }

  return memory[sessionId];
}

function logEntry(sessionId, entry) {
  ensureSession(sessionId).push({ timestamp: Date.now(), ...entry });
}

function rpcSuccess(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function makeText(text) {
  return { content: [{ type: "text", text }] };
}

function buildAgentCard(req) {
  const baseUrl = getBaseUrl(req);

  return {
    name: profile.name,
    description: profile.description,
    url: `${baseUrl}/`,
    version: profile.version,
    author: profile.author,
    capabilities: ["mcp", "a2a", "tools", "prompts", "resources"],
    endpoints: {
      mcp: `${baseUrl}/mcp`,
      a2a: `${baseUrl}/a2a`,
      agentCard: `${baseUrl}/.well-known/agent-card.json`
    },
    skills: profile.skills
  };
}

function getOverview(req) {
  return {
    profile: profile.id,
    serverInfo: { name: profile.name, version: profile.version },
    protocol: "MCP over JSON-RPC 2.0",
    transport: {
      endpoint: `${getBaseUrl(req)}/mcp`,
      method: "POST",
      contentType: "application/json"
    },
    capabilities: { tools: {}, prompts: {}, resources: {} },
    tools: profile.tools,
    prompts: profile.prompts,
    resources: profile.resources
  };
}

function classifyTopic(text) {
  const lower = (text || "").toLowerCase();

  if (lower.includes("wallet") || lower.includes("token") || lower.includes("chain")) return "onchain";
  if (lower.includes("ai") || lower.includes("agent") || lower.includes("automation")) return "ai";
  if (lower.includes("incident") || lower.includes("workflow") || lower.includes("release")) return "operations";
  return "general";
}

function executeTool(toolName, args, sessionId) {
  logEntry(sessionId, { type: "tool", name: toolName, arguments: args });

  if (toolName === "chat") return makeText(`Dataweb reply: ${args.message}. Focus: clarity, context, and next steps.`);
  if (toolName === "analyze") return makeText(`Structured analysis for ${args.data}: trend stable, catalysts visible, and watchpoints identified.`);
  if (toolName === "predict") return makeText(`Forecast for ${args.data}: constructive bias over the near term with medium confidence.`);
  if (toolName === "classify") return makeText(`Category: ${classifyTopic(args.text)}.`);
  if (toolName === "generate") return makeText(`Draft generated from prompt: ${args.prompt}.`);
  if (toolName === "multi_agent") {
    return makeText([
      "Multi-agent run complete.",
      profile.agents.analyst(args.task),
      profile.agents.strategist(args.task),
      profile.agents.executor(args.task)
    ].join("\n"));
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

function getPrompt(promptName, args = {}) {
  if (promptName === "crypto_analysis") {
    const asset = args.asset || "the selected market";
    return {
      description: "Structured crypto analysis prompt.",
      messages: [{ role: "user", content: { type: "text", text: `Analyze ${asset}. Cover trend, positioning, catalysts, invalidation levels, and risk.` } }]
    };
  }

  if (promptName === "ai_strategy") {
    const goal = args.goal || "workflow acceleration";
    return {
      description: "AI strategy prompt.",
      messages: [{ role: "user", content: { type: "text", text: `Design an AI strategy for ${goal}. Include quick wins, operating model, guardrails, and metrics.` } }]
    };
  }

  throw new Error(`Unknown prompt: ${promptName}`);
}

function readResource(uri) {
  if (uri === "resource://dataweb/market-data") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ movers: [
          { symbol: "BTC", momentum: "high", bias: "constructive" },
          { symbol: "SOL", momentum: "medium", bias: "watch pullbacks" },
          { symbol: "TAO", momentum: "high", bias: "trend intact" }
        ] }, null, 2)
      }]
    };
  }

  if (uri === "resource://dataweb/memory") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ sessions: memory }, null, 2)
      }]
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
}

function runA2A(agentName, task, sessionId) {
  const agent = profile.agents[agentName];

  if (!agent) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  logEntry(sessionId, { type: "a2a", agent: agentName, task });
  return { agent: agentName, result: agent(task || "default task"), status: "ok", profile: profile.id };
}

function handleRpc(req, res) {
  const body = req.body || {};
  const id = body.id ?? null;
  const method = body.method;
  const params = body.params || {};
  const sessionId = getSessionId(req);

  if (!method) {
    return res.status(400).json(rpcError(id, -32600, "Missing JSON-RPC method"));
  }

  try {
    if (method === "initialize") {
      return res.json(rpcSuccess(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, prompts: {}, resources: {} },
        serverInfo: { name: profile.name, version: profile.version },
        instructions: "Use tools/list, prompts/list, and resources/list to inspect available capabilities."
      }));
    }

    if (method === "ping") return res.json(rpcSuccess(id, {}));
    if (method === "notifications/initialized") return id === null ? res.status(202).end() : res.json(rpcSuccess(id, {}));
    if (method === "tools/list") return res.json(rpcSuccess(id, { tools: profile.tools }));
    if (method === "tools/call") return res.json(rpcSuccess(id, executeTool(params.name, params.arguments || {}, sessionId)));
    if (method === "prompts/list") return res.json(rpcSuccess(id, { prompts: profile.prompts }));
    if (method === "prompts/get") return res.json(rpcSuccess(id, getPrompt(params.name, params.arguments || {})));
    if (method === "resources/list") return res.json(rpcSuccess(id, { resources: profile.resources }));
    if (method === "resources/read") return res.json(rpcSuccess(id, readResource(params.uri)));

    return res.status(404).json(rpcError(id, -32601, `Method not found: ${method}`));
  } catch (error) {
    return res.status(400).json(rpcError(id, -32000, error instanceof Error ? error.message : "Internal error"));
  }
}

function buildUi() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${profile.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --page: ${profile.theme.page};
      --panel: ${profile.theme.panel};
      --panel-edge: ${profile.theme.panelEdge};
      --accent: ${profile.theme.accent};
      --accent-soft: ${profile.theme.accentSoft};
      --glow: ${profile.theme.glow};
      --text: #f4f7fb;
      --muted: #9fb0c6;
      --line: rgba(255,255,255,0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Manrope", sans-serif;
      color: var(--text);
      background: radial-gradient(circle at top left, var(--glow), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.02), transparent 25%), var(--page);
      min-height: 100vh;
    }
    .shell { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .hero, .panel {
      border: 1px solid var(--panel-edge);
      background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), var(--panel);
      border-radius: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.28);
    }
    .hero { padding: 28px; overflow: hidden; position: relative; }
    .hero::after {
      content: ""; position: absolute; right: -90px; top: -90px; width: 220px; height: 220px; border-radius: 999px;
      background: radial-gradient(circle, var(--glow), transparent 68%);
    }
    .eyebrow, .badge {
      display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--panel-edge);
      color: var(--accent-soft); background: rgba(255,255,255,0.05); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em;
    }
    h1, h2, h3 { margin: 0; font-family: "Space Grotesk", sans-serif; letter-spacing: -0.03em; }
    h1 { margin-top: 16px; font-size: clamp(40px, 8vw, 72px); line-height: 0.95; max-width: 10ch; }
    p { color: var(--muted); line-height: 1.7; }
    .hero-grid, .main-grid, .stats, .endpoints { display: grid; gap: 18px; }
    .hero-grid { grid-template-columns: 1.4fr .8fr; align-items: end; }
    .main-grid { grid-template-columns: 1.15fr .85fr; margin-top: 24px; }
    .stats, .endpoints { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .panel { padding: 22px; }
    .card, .endpoint, .console { border-radius: 22px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); padding: 18px; }
    .card strong, .endpoint strong { display: block; margin-top: 10px; font-size: 24px; font-family: "Space Grotesk", sans-serif; }
    .list { display: grid; gap: 12px; }
    .item { padding: 14px 16px; border-radius: 18px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); }
    .item strong { display: block; margin-bottom: 6px; }
    .endpoint code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .endpoint code { display: block; margin-top: 10px; padding: 12px; border-radius: 14px; background: rgba(0,0,0,0.25); overflow-wrap: anywhere; }
    .toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    button {
      border: 0; cursor: pointer; border-radius: 14px; padding: 12px 16px; font: inherit; font-weight: 800;
      color: #081019; background: linear-gradient(135deg, var(--accent), var(--accentSoft, var(--accent-soft)));
    }
    pre { margin: 14px 0 0; min-height: 260px; max-height: 420px; overflow: auto; padding: 16px; border-radius: 18px; background: rgba(0,0,0,0.32); color: #d6dfec; }
    @media (max-width: 980px) { .hero-grid, .main-grid, .stats, .endpoints { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { .shell { padding: 16px; } h1 { font-size: 42px; } }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${profile.heroLabel}</span>
          <h1>${profile.name}</h1>
          <p>${profile.description}</p>
        </div>
        <div class="stats">
          <div class="card"><span class="badge">Tools</span><strong>${profile.tools.length}</strong><p>Callable MCP capabilities</p></div>
          <div class="card"><span class="badge">Prompts</span><strong>${profile.prompts.length}</strong><p>Prompt templates for repeatable work</p></div>
          <div class="card"><span class="badge">Resources</span><strong>${profile.resources.length}</strong><p>Readable context sources</p></div>
          <div class="card"><span class="badge">Agents</span><strong>${Object.keys(profile.agents).length}</strong><p>Internal A2A collaborators</p></div>
        </div>
      </div>
    </section>

    <section class="main-grid">
      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;"><h2>Capabilities</h2><span class="badge">MCP</span></div>
        <div class="list">${profile.tools.map((tool) => `<div class="item"><strong>${tool.name}</strong><p>${tool.description}</p></div>`).join("")}</div>
      </div>

      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;"><h2>Endpoints</h2><span class="badge">Live</span></div>
        <div class="endpoints">
          <div class="endpoint"><span class="badge">MCP</span><code>/mcp</code></div>
          <div class="endpoint"><span class="badge">A2A</span><code>/a2a</code></div>
          <div class="endpoint"><span class="badge">Agent Card</span><code>/.well-known/agent-card.json</code></div>
          <div class="endpoint"><span class="badge">Resource</span><code>/resources/market_data</code></div>
        </div>
      </div>

      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;"><h2>Prompts & Resources</h2><span class="badge">Context</span></div>
        <div class="list">
          ${profile.prompts.map((prompt) => `<div class="item"><strong>${prompt.name}</strong><p>${prompt.description}</p></div>`).join("")}
          ${profile.resources.map((resource) => `<div class="item"><strong>${resource.name}</strong><p>${resource.uri}</p></div>`).join("")}
        </div>
      </div>

      <div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;"><h2>Interactive Tester</h2><span class="badge">JSON-RPC</span></div>
        <div class="toolbar">
          <button id="initializeBtn">Initialize</button>
          <button id="toolsBtn">Tools List</button>
          <button id="toolCallBtn">Call First Tool</button>
          <button id="resourceBtn">Read First Resource</button>
          <button id="a2aBtn">Run A2A</button>
        </div>
        <pre id="output">Use the tester to inspect MCP and A2A responses.</pre>
      </div>
    </section>
  </div>

  <script>
    const sampleToolArgs = {
      chat: { message: "Summarize today's signal landscape" },
      analyze: { data: "BTC momentum and ETF flow notes" },
      predict: { data: "AI infrastructure basket" },
      classify: { text: "AI agent workflow for wallet monitoring" },
      generate: { prompt: "Create a concise market wrap" },
      multi_agent: { task: "market expansion brief" }
    };

    async function postJson(body, endpoint) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      return response.json();
    }

    document.getElementById("initializeBtn").addEventListener("click", async function() {
      const data = await postJson({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ui-tester", version: "1.0.0" } } }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("toolsBtn").addEventListener("click", async function() {
      const data = await postJson({ jsonrpc: "2.0", id: 2, method: "tools/list" }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("toolCallBtn").addEventListener("click", async function() {
      const firstTool = ${JSON.stringify(profile.tools[0].name)};
      const data = await postJson({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: firstTool, arguments: sampleToolArgs[firstTool] } }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("resourceBtn").addEventListener("click", async function() {
      const data = await postJson({ jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: ${JSON.stringify(profile.resources[0].uri)} } }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("a2aBtn").addEventListener("click", async function() {
      const data = await postJson({ agent: ${JSON.stringify(Object.keys(profile.agents)[0])}, task: "market briefing" }, "/a2a");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });
  </script>
</body>
</html>`;
}

app.get("/.well-known/agent-card.json", (req, res) => {
  res.json(buildAgentCard(req));
});

app.get("/mcp", (req, res) => {
  res.json(getOverview(req));
});

app.post("/mcp", (req, res) => {
  if (req.body?.jsonrpc === "2.0") {
    return handleRpc(req, res);
  }

  const sessionId = getSessionId(req);

  try {
    const result = executeTool(req.body?.tool || profile.tools[0].name, req.body?.input || {}, sessionId);
    return res.json({ output: { profile: profile.id, result: result.content[0].text, agent: profile.name } });
  } catch {
    return res.status(400).json({ output: { profile: profile.id, result: "Recovered from error", agent: profile.name } });
  }
});

app.get("/resources/:resourceName", (req, res) => {
  const resource = profile.resources.find((item) => item.name === req.params.resourceName);

  if (!resource) {
    return res.status(404).json({ error: "Resource not found" });
  }

  return res.json(JSON.parse(readResource(resource.uri).contents[0].text));
});

app.post("/a2a", (req, res) => {
  try {
    res.json(runA2A(req.body?.agent, req.body?.task, getSessionId(req)));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "A2A failed" });
  }
});

app.get("/", (req, res) => {
  res.send(buildUi());
});

export default app;
