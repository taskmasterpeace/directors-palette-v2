---
name: dev-server
description: Start Next.js dev server in background agent
context: fork
agent: Bash
---

# Dev Server Background Agent

Start the Next.js development server in a background agent so it runs in parallel while Claude works on other tasks.

## Usage

```
/dev-server
```

## What It Does

- Starts `npm run dev` with Turbopack
- Runs in background (context: fork)
- Frees up terminal for Claude to continue working
- Auto-selects available port if 3000 is taken

## Managing Background Tasks

- **Check status**: Use `/tasks` command to see running background agents
- **Stop it**: Use Ctrl+C in the background task view
- **View output**: Background output is logged and can be checked

## Implementation

```bash
cd "D:\git\directors-palette-v2" && npm run dev
```

## Notes

This runs indefinitely until stopped. The dev server will:
- Compile on http://localhost:3000 (or next available port)
- Hot reload on file changes
- Show compilation errors in background logs

Perfect for keeping the server running while Claude refactors, adds features, or runs tests.
