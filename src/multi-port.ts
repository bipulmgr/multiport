#!/usr/bin/env bun
import { spawn } from "child_process";
import { existsSync } from "fs";

// Default ports to run on
const DEFAULT_PORTS = [3000, 3001, 3002, 3003];

// Parse command line arguments
const args = process.argv.slice(2);
const ports: number[] = [];
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`
🚀 Multi-Port Server Launcher

Usage: bun run multi-port.ts [options] [ports...]

Options:
  --help, -h          Show this help message
  --ports <list>      Comma-separated list of ports (e.g., --ports 3000,3001,3002)
  --default           Use default ports (3000, 3001, 3002, 3003)

Examples:
  bun run multi-port.ts                    # Use default ports
  bun run multi-port.ts 3000 3001 3002     # Use specific ports
  bun run multi-port.ts --ports 3000,3001  # Use comma-separated ports
  bun run multi-port.ts --default          # Explicitly use default ports

Note: Each server instance will run independently with hot reloading enabled.
`);
  process.exit(0);
}

// Parse ports from arguments
if (args.includes("--default")) {
  ports.push(...DEFAULT_PORTS);
} else {
  // Look for --ports argument
  const portsIndex = args.findIndex(arg => arg === "--ports");
  if (portsIndex !== -1 && portsIndex + 1 < args.length) {
    const portsString = args[portsIndex + 1];
    const parsedPorts = portsString.split(",").map(p => parseInt(p.trim(), 10));
    ports.push(...parsedPorts.filter(p => !isNaN(p)));
  } else {
    // Parse individual port arguments
    for (const arg of args) {
      if (!arg.startsWith("--")) {
        const port = parseInt(arg, 10);
        if (!isNaN(port)) {
          ports.push(port);
        }
      }
    }
  }
}

// If no ports specified, use defaults
if (ports.length === 0) {
  ports.push(...DEFAULT_PORTS);
}

console.log(`🚀 Starting ${ports.length} server instance(s) on ports: ${ports.join(", ")}\n`);

// Track running processes
const processes: Array<{ port: number; process: any }> = [];

// Function to start a server on a specific port
function startServer(port: number) {
  console.log(`📡 Starting server on port ${port}...`);
  
  const child = spawn("bun", ["--hot", "src/index.tsx"], {
    env: { ...process.env, PORT: port.toString() },
    stdio: "pipe",
  });

  // Handle stdout
  child.stdout?.on("data", (data) => {
    const output = data.toString();
    // Only show relevant output lines
    if (output.includes("Server running") || output.includes("error") || output.includes("Error")) {
      console.log(`[Port ${port}] ${output.trim()}`);
    }
  });

  // Handle stderr
  child.stderr?.on("data", (data) => {
    const output = data.toString();
    console.log(`[Port ${port}] ${output.trim()}`);
  });

  // Handle process exit
  child.on("exit", (code) => {
    console.log(`[Port ${port}] Server stopped with code ${code}`);
    // Remove from processes array
    const index = processes.findIndex(p => p.port === port);
    if (index !== -1) {
      processes.splice(index, 1);
    }
  });

  processes.push({ port, process: child });
}

// Start all servers
for (const port of ports) {
  startServer(port);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down all servers...");
  for (const { port, process: child } of processes) {
    console.log(`[Port ${port}] Stopping server...`);
    child.kill("SIGTERM");
  }
  
  // Force exit after a short delay
  setTimeout(() => {
    console.log("✅ All servers stopped");
    process.exit(0);
  }, 1000);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  for (const { port, process: child } of processes) {
    child.kill("SIGTERM");
  }
  process.exit(0);
});

// Keep the main process alive
console.log("💡 Press Ctrl+C to stop all servers\n");
