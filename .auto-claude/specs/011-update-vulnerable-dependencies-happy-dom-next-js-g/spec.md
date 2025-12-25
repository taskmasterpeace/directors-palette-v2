# Update vulnerable dependencies (happy-dom, Next.js, glob)

## Overview

npm audit reveals critical and high severity CVEs in production dependencies: happy-dom (<20.0.0) has VM Context Escape leading to RCE, Next.js (15.5.1-15.5.7) has DoS and source code exposure vulnerabilities, glob (11.0.0-11.0.3) has command injection via CLI. Additional moderate vulnerabilities exist in js-yaml, tar, and vite.

## Rationale

These are known, exploitable vulnerabilities with published CVEs. The happy-dom RCE (GHSA-37j7-fg3j-429f) and Next.js DoS (GHSA-mwv6-3258-q52c) are particularly severe as they could allow attackers to execute arbitrary code or crash the application. Dependency vulnerabilities are a top OWASP risk (A06).

---
*This spec was created from ideation and is pending detailed specification.*
