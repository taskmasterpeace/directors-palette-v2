# Browser Testing Guide for Directors Palette

This guide documents how Claude Code can interact with Directors Palette via Chrome browser automation.

## Quick Reference

### URLs
| Environment | URL |
|-------------|-----|
| **Production** | `https://directors-palette-v2.vercel.app` |
| **Local Dev** | `http://localhost:3000` (when running) |
| **Sign In** | `/auth/signin` |
| **Landing** | `/landing` |

### Test Credentials
Stored in `.env.local`:
```
TEST_USER_EMAIL=taskmasterpeace@gmail.com
TEST_USER_PASSWORD=TA$K2004
```

## Browser Automation Workflow

### Step 1: Get Tab Context
```
mcp__claude-in-chrome__tabs_context_mcp (createIfEmpty: true)
```

### Step 2: Create New Tab
```
mcp__claude-in-chrome__tabs_create_mcp
```
Save the returned `tabId` for subsequent operations.

### Step 3: Navigate to Directors Palette
```
mcp__claude-in-chrome__navigate
- url: "https://directors-palette-v2.vercel.app"
- tabId: <your-tab-id>
```

### Step 4: Login (if needed)
1. Navigate to `/auth/signin`
2. Read page to get element refs:
   ```
   mcp__claude-in-chrome__read_page (filter: "interactive")
   ```
3. Fill credentials:
   ```
   mcp__claude-in-chrome__form_input (ref: email_ref, value: email)
   mcp__claude-in-chrome__form_input (ref: password_ref, value: password)
   ```
4. Click Sign In:
   ```
   mcp__claude-in-chrome__computer (action: "left_click", ref: submit_ref)
   ```

### Step 5: Verify Login
Wait and check URL changed from `/auth/signin` to `/`:
```
mcp__claude-in-chrome__computer (action: "wait", duration: 3)
```

## Main App Pages

### Shot Creator (Root `/`)
Main interface elements:
- Prompt textbox: "Enter your prompt here..."
- Generate button
- Gallery panel with Images/Library tabs
- Admin Panel link (if admin)

### Storyboard (`/test-storyboard`)
- Story input
- Character extraction
- Shot generation

### Gallery (`/gallery`)
- All generated images/videos
- Folders
- Search

### Shot Animator
- Video generation from images
- Animation prompt input

## Common Operations

### Take Screenshot
```
mcp__claude-in-chrome__computer (action: "screenshot", tabId: <id>)
```
Note: May fail if chrome extensions interfere.

### Read Page Elements
```
mcp__claude-in-chrome__read_page (tabId: <id>, filter: "interactive")
```
Returns refs like `ref_1`, `ref_2` that can be clicked.

### Click Element
```
mcp__claude-in-chrome__computer (action: "left_click", ref: "ref_X", tabId: <id>)
```

### Type Text
```
mcp__claude-in-chrome__form_input (ref: "ref_X", value: "text", tabId: <id>)
```

### Press Key
```
mcp__claude-in-chrome__computer (action: "key", text: "Enter", tabId: <id>)
```

## Troubleshooting

### "Cannot access a chrome-extension:// URL" Error
- This happens when another extension has focus
- Try: Create a new tab and navigate fresh
- Try: Wait a few seconds and retry

### Screenshots Failing
- Some extension overlays block screenshots
- Use `read_page` as alternative to understand content

### Dev Server Not Running
To start Directors Palette locally:
```bash
cd D:\git\directors-palette-v2
npm run dev
```
Note: Port 3000 may be used by other apps. Check with:
```bash
curl -s http://localhost:3000 | head -5
```

## Session Checklist

1. [ ] Get tab context
2. [ ] Create/identify tab for Directors Palette
3. [ ] Navigate to production or local URL
4. [ ] Login if needed (credentials auto-fill in browser)
5. [ ] Verify login by checking page elements
6. [ ] Navigate to specific feature to test

## Tab ID Storage

During a session, track the active tab:
- **Directors Palette Tab ID**: Set after creating tab

This allows returning to the same tab throughout the conversation.
