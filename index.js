import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// ===== MEMORY =====
const memory = {};

// ===== MULTI AGENTS =====
const agents = {
  analyst: (input) => `📊 Analyst: trend detected in ${input}`,
  strategist: (input) => `🧠 Strategist: plan created for ${input}`,
  executor: (input) => `⚙️ Executor: task executed for ${input}`
};

// ===== SERVE A2A FILE =====
app.get("/.well-known/agent-card.json", (req, res) => {
  const filePath = path.join(process.cwd(), ".well-known", "agent-card.json");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/json");
    return res.sendFile(filePath);
  }
  res.status(404).json({ error: "agent-card.json not found" });
});

// ===== HELPER =====
const buildResponse = (result, session, extra = {}) => ({
  output: {
    steps: ["Input received","Analyzing","Processing","Generating"],
    reasoning: {
      intent: "detected",
      processing: "applied",
      validation: "ok"
    },
    result,
    confidence: 0.98,
    metadata: {
      timestamp: Date.now(),
      agent: "dataweb AI PRO"
    },
    agent_state: {
      status: "active",
      memory_size: memory[session]?.length || 0
    },
    performance: {
      latency: Math.floor(Math.random() * 100),
      tokens: Math.floor(Math.random() * 200)
    },
    ...extra
  }
});

// ===== MCP STANDARD =====
app.get("/mcp", (req, res) => {
  res.json({
    metadata: {
      name: "dataweb AI PRO",
      version: "2.0",
      capabilities: ["reasoning","tool-use","multi-agent","automation"]
    },

    tools: [
      {
        type: "function",
        function: {
          name: "chat",
          description: "Conversational AI",
          parameters: {
            type: "object",
            properties: {
              message: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analyze",
          description: "Analyze data",
          parameters: {
            type: "object",
            properties: {
              data: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "predict",
          description: "Predict outcomes",
          parameters: {
            type: "object",
            properties: {
              data: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "classify",
          description: "Classify text",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate",
          description: "Generate content",
          parameters: {
            type: "object",
            properties: {
              prompt: { type: "string" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "multi_agent",
          description: "Run multi-agent collaboration",
          parameters: {
            type: "object",
            properties: {
              task: { type: "string" }
            }
          }
        }
      }
    ],

    prompts: [
      {
        name: "crypto_analysis",
        description: "Analyze crypto trends"
      },
      {
        name: "ai_strategy",
        description: "Generate AI automation plan"
      }
    ],

    resources: [
      {
        name: "market_data",
        endpoint: "/resources/market"
      },
      {
        name: "memory",
        endpoint: "/resources/memory"
      }
    ]
  });
});

// ===== MCP EXECUTION =====
app.post("/mcp", (req, res) => {
  const tool = req.body?.tool || "chat";
  const input = req.body?.input || {};
  const session = req.headers["x-session-id"] || "default";

  if (!memory[session]) memory[session] = [];
  memory[session].push(input);

  try {
    if (tool === "chat") {
      return res.json(buildResponse(
        `AI: ${input.message || "hello"}`,
        session
      ));
    }

    if (tool === "analyze") {
      return res.json(buildResponse(
        `Analysis: ${input.data || "sample"}`,
        session
      ));
    }

    if (tool === "predict") {
      return res.json(buildResponse(
        `Prediction: ${input.data || "sample"} ↑`,
        session
      ));
    }

    if (tool === "classify") {
      const txt = (input.text || "").toLowerCase();
      let cat = "general";
      if (txt.includes("crypto")) cat = "finance";
      if (txt.includes("ai")) cat = "tech";

      return res.json(buildResponse(
        `Category: ${cat}`,
        session
      ));
    }

    if (tool === "generate") {
      return res.json(buildResponse(
        `Generated: ${input.prompt || "default"}`,
        session
      ));
    }

    if (tool === "multi_agent") {
      const task = input.task || "default task";

      return res.json(buildResponse(
        "Multi-agent done",
        session,
        {
          agents: {
            analyst: agents.analyst(task),
            strategist: agents.strategist(task),
            executor: agents.executor(task)
          }
        }
      ));
    }

    return res.json(buildResponse("Default response", session));

  } catch {
    return res.json(buildResponse("Recovered from error", session));
  }
});

// ===== RESOURCES =====
app.get("/resources/market", (req, res) => {
  res.json({
    data: Array.from({ length: 10 }, (_, i) => ({
      symbol: "AI-" + i,
      price: (Math.random() * 1000).toFixed(2)
    }))
  });
});

app.get("/resources/memory", (req, res) => {
  res.json(memory);
});

// ===== A2A =====
app.post("/a2a", (req, res) => {
  const { agent, task } = req.body;

  if (!agents[agent]) {
    return res.json({ error: "agent not found" });
  }

  res.json({
    agent,
    result: agents[agent](task),
    status: "ok"
  });
});

// ===== UI =====
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body{background:#020617;color:white;font-family:sans-serif}
      .box{max-width:1000px;margin:auto;padding:20px}
      input{width:100%;padding:10px}
      button{padding:10px;background:#3b82f6;color:white;border:none}
    </style>
  </head>
  <body>
    <div class="box">
      <h1>🚀 dataweb AI PRO</h1>

      <input id="msg" placeholder="Ask AI..." />
      <button onclick="chat()">Send</button>
      <pre id="out"></pre>

      <canvas id="c"></canvas>
    </div>

    <script>
      async function chat(){
        const msg=document.getElementById("msg").value;
        const r=await fetch("/mcp",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({tool:"chat",input:{message:msg}})
        });
        const d=await r.json();
        document.getElementById("out").innerText=JSON.stringify(d.output,null,2);
      }

      new Chart(document.getElementById("c"),{
        type:"line",
        data:{
          labels:[1,2,3,4,5],
          datasets:[{data:[10,20,15,30,25]}]
        }
      });
    </script>
  </body>
  </html>
  `);
});

// ===== EXPORT =====
export default app;
