---
name: lognog
description: Query and monitor LogNog analytics - errors, slow calls, stats
---

# LogNog Analytics Skill

Query and monitor your Directors Palette logs via LogNog.

## Available Commands

### Quick Queries

```bash
/lognog errors           # Recent errors (last 1h)
/lognog errors 24h       # Errors in last 24 hours
/lognog slow             # Slow API calls (>3s)
/lognog slow 5000        # API calls >5000ms
/lognog stats            # Dashboard summary
/lognog user john@x.com  # All logs for specific user
```

### Custom Queries

```bash
/lognog query "search index=nextjs type=error | head 20"
/lognog query "search index=nextjs integration=replicate | stats avg(latency_ms) by model"
```

## Implementation

### 1. Recent Errors

```bash
curl -s -X POST "https://analytics.machinekinglabs.com/api/search/query" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LOGNOG_API_KEY" \
  -d '{
    "query": "search index=nextjs type=error | sort desc timestamp | head 20",
    "earliest": "-1h",
    "latest": "now"
  }'
```

**Output format:**
```
ERRORS (last 1h): 3 found

1. [06:23:26] /api/generation/image
   Error: Replicate API timeout
   User: john@example.com

2. [06:15:12] /api/storyboard/generate-prompts
   Error: OpenRouter rate limit exceeded
   User: jane@example.com
```

### 2. Slow API Calls

```bash
curl -s -X POST "https://analytics.machinekinglabs.com/api/search/query" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LOGNOG_API_KEY" \
  -d '{
    "query": "search index=nextjs type=api duration_ms>3000 | sort desc duration_ms | head 20",
    "earliest": "-1h",
    "latest": "now"
  }'
```

**Output format:**
```
SLOW CALLS (>3000ms, last 1h): 5 found

1. [06:23:26] POST /api/generation/image - 8523ms
   Integration: replicate (7200ms)
   Model: nano-banana-pro

2. [06:20:15] POST /api/storybook/synthesize - 4100ms
   Integration: elevenlabs (3800ms)
```

### 3. Dashboard Stats

```bash
curl -s -X POST "https://analytics.machinekinglabs.com/api/search/query" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LOGNOG_API_KEY" \
  -d '{
    "query": "search index=nextjs type=api | stats count, avg(duration_ms) as avg_latency, count(eval(status_code>=400)) as errors by route | sort desc count | head 10",
    "earliest": "-24h",
    "latest": "now"
  }'
```

**Output format:**
```
DASHBOARD (last 24h)

Top Routes:
  /api/generation/image    152 calls, 3200ms avg, 3 errors
  /api/storyboard/generate  89 calls, 1500ms avg, 1 error
  /api/credits              45 calls,   50ms avg, 0 errors

Integrations:
  replicate:   152 calls, 3100ms avg, 98% success
  elevenlabs:   34 calls, 2800ms avg, 100% success
  openrouter:   89 calls,  800ms avg, 95% success

Business Events (24h):
  generation_completed: 145
  credit_deduction: 145
  webhook_received: 89
```

### 4. User Lookup

```bash
curl -s -X POST "https://analytics.machinekinglabs.com/api/search/query" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $LOGNOG_API_KEY" \
  -d '{
    "query": "search index=nextjs user_email=\"john@example.com\" | sort desc timestamp | head 50",
    "earliest": "-7d",
    "latest": "now"
  }'
```

## Useful Queries Reference

```bash
# Credits usage by user (last 24h)
search index=nextjs event=credit_deduction earliest=-24h
| stats sum(credits_deducted) as total by user_email
| sort desc total

# Error rate by route
search index=nextjs type=api
| stats count as total, count(eval(status_code>=400)) as errors by route
| eval error_rate=round(errors/total*100, 1)
| sort desc error_rate

# Slow Replicate calls by model
search index=nextjs integration=replicate latency_ms>5000
| stats count, avg(latency_ms), p95(latency_ms) by model

# Hourly request volume
search index=nextjs type=api
| timechart span=1h count by route

# Failed integrations
search index=nextjs type=integration success=false
| table timestamp, integration, error, user_email

# Cost by model (if estimatedCost logged)
search index=nextjs integration=replicate
| stats sum(estimated_cost) as cost, count by model
| sort desc cost
```

## Environment

Requires `LOGNOG_API_KEY` in `.env.local`:
```
LOGNOG_API_KEY=lnog_f6ca89cdb6e84bed845422f306a49467_...
```

## When to Use

- Debugging production errors
- Investigating slow performance
- Checking user activity
- Monitoring integration health
- Analyzing usage patterns
