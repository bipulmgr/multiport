#!/usr/bin/env bun
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Load port configuration
let portConfig: any = {};
const configPath = join(process.cwd(), "ports.config.json");

if (existsSync(configPath)) {
  try {
    portConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (error) {
    console.warn("⚠️  Could not load ports.config.json, using defaults");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const help = args.includes("--help") || args.includes("-h");
const listProfiles = args.includes("--list") || args.includes("-l");

if (help) {
  console.log(`
🚀 Multi-Port Server Launcher (Config-based)

Usage: bun run multi-port-config.ts [options] [profile|ports...]

Options:
  --help, -h          Show this help message
  --list, -l          List available profiles
  --profile <name>    Use a specific profile from ports.config.json
  --ports <list>      Comma-separated list of ports (e.g., --ports 3000,3001,3002)

Profiles:
  development         Default development servers (ports: ${portConfig.development?.ports?.join(", ") || "3000,3001,3002,3003"})
  testing            Testing servers (ports: ${portConfig.testing?.ports?.join(", ") || "4000,4001,4002"})
  staging            Staging servers (ports: ${portConfig.staging?.ports?.join(", ") || "5000,5001"})

Examples:
  bun run multi-port-config.ts                    # Use development profile
  bun run multi-port-config.ts --profile testing  # Use testing profile
  bun run multi-port-config.ts 3000 3001 3002     # Use specific ports
  bun run multi-port-config.ts --ports 3000,3001  # Use comma-separated ports
  bun run multi-port-config.ts --list             # List available profiles

Note: Each server instance will run independently with hot reloading enabled.
`);
  process.exit(0);
}

if (listProfiles) {
  console.log("📋 Available profiles:\n");
  for (const [name, config] of Object.entries(portConfig)) {
    if (name !== "defaultPorts" && typeof config === "object" && config !== null) {
      const profile = config as any;
      console.log(`  ${name.padEnd(12)} - ${profile.description || "No description"}`);
      console.log(`  ${"".padEnd(12)}   Ports: ${profile.ports?.join(", ") || "Not configured"}\n`);
    }
  }
  process.exit(0);
}

// Determine which ports to use
let ports: number[] = [];

// Check for profile argument
const profileIndex = args.findIndex(arg => arg === "--profile");
if (profileIndex !== -1 && profileIndex + 1 < args.length) {
  const profileName = args[profileIndex + 1];
  const profile = portConfig[profileName];
  if (profile && profile.ports) {
    ports = profile.ports;
    console.log(`📋 Using profile: ${profileName}`);
    if (profile.description) {
      console.log(`📝 ${profile.description}\n`);
    }
  } else {
    console.error(`❌ Profile '${profileName}' not found in ports.config.json`);
    process.exit(1);
  }
} else {
  // Check for --ports argument
  const portsIndex = args.findIndex(arg => arg === "--ports");
  if (portsIndex !== -1 && portsIndex + 1 < args.length) {
    const portsString = args[portsIndex + 1];
    const parsedPorts = portsString.split(",").map(p => parseInt(p.trim(), 10));
    ports = parsedPorts.filter(p => !isNaN(p));
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

// If no ports specified, use development profile or defaults
if (ports.length === 0) {
  if (portConfig.development?.ports) {
    ports = portConfig.development.ports;
    console.log("📋 Using development profile (default)");
  } else {
    ports = portConfig.defaultPorts || [3000, 3001, 3002, 3003];
    console.log("📋 Using default ports");
  }
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
