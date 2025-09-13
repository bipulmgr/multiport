# Multi-Port Server Guide

This project supports running multiple instances of the Bun server simultaneously on different ports. This is useful for:

- **Development**: Testing different features in parallel
- **Load Testing**: Simulating multiple users
- **Microservices**: Running different services on different ports
- **A/B Testing**: Comparing different versions side by side

## Quick Start

### Basic Multi-Port Usage

```bash
# Run on default ports (3000, 3001, 3002, 3003)
bun run dev:multi

# Run on specific ports
bun run dev:multi 3000 3001 3002

# Run with comma-separated ports
bun run dev:multi --ports 3000,3001,3002
```

### Configuration-Based Usage

```bash
# Use development profile (default)
bun run dev:config

# Use testing profile
bun run dev:testing

# Use staging profile
bun run dev:staging

# List available profiles
bun run dev:config --list
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Single server on port 3000 |
| `bun run dev:multi` | Multi-port launcher (basic) |
| `bun run dev:ports` | Multi-port with default ports |
| `bun run dev:config` | Config-based multi-port launcher |
| `bun run dev:testing` | Testing profile (ports 4000-4002) |
| `bun run dev:staging` | Staging profile (ports 5000-5001) |

## Configuration

The `ports.config.json` file defines different port profiles:

```json
{
  "defaultPorts": [3000, 3001, 3002, 3003],
  "development": {
    "ports": [3000, 3001, 3002, 3003],
    "description": "Development servers with hot reloading"
  },
  "testing": {
    "ports": [4000, 4001, 4002],
    "description": "Testing servers for different test scenarios"
  },
  "staging": {
    "ports": [5000, 5001],
    "description": "Staging servers for pre-production testing"
  }
}
```

## Features

- ✅ **Hot Reloading**: Each server instance supports hot reloading
- ✅ **Port Identification**: API responses include the port number
- ✅ **Graceful Shutdown**: Ctrl+C stops all servers cleanly
- ✅ **Profile Management**: Easy switching between different port configurations
- ✅ **Error Handling**: Individual server failures don't affect others
- ✅ **Logging**: Clear output showing which port each message comes from

## API Endpoints

Each server instance exposes the same API endpoints:

- `GET /api/hello` - Returns hello message with port info
- `PUT /api/hello` - Returns hello message with port info
- `GET /api/hello/:name` - Returns personalized hello with port info

Example response:
```json
{
  "message": "Hello, world!",
  "method": "GET",
  "port": 3000
}
```

## Troubleshooting

### Port Already in Use
If you get "port in use" errors:
1. Check what's running on those ports: `lsof -i :3000`
2. Kill existing processes: `kill -9 <PID>`
3. Use different ports: `bun run dev:multi 3001 3002 3003 3004`

### Server Not Starting
- Ensure Bun is installed and up to date
- Check that all dependencies are installed: `bun install`
- Verify the port configuration in `ports.config.json`

### Performance Issues
- Reduce the number of concurrent servers
- Use different port ranges for different purposes
- Monitor system resources when running many instances

## Examples

### Development Workflow
```bash
# Start development servers
bun run dev:config

# In another terminal, test different endpoints
curl http://localhost:3000/api/hello
curl http://localhost:3001/api/hello
curl http://localhost:3002/api/hello
```

### Load Testing
```bash
# Start multiple servers
bun run dev:multi 3000 3001 3002 3003 3004

# Use a tool like Apache Bench to test
ab -n 1000 -c 10 http://localhost:3000/api/hello
ab -n 1000 -c 10 http://localhost:3001/api/hello
```

### A/B Testing
```bash
# Start two servers for comparison
bun run dev:multi 3000 3001

# Test different versions on different ports
# Port 3000: Version A
# Port 3001: Version B
```
