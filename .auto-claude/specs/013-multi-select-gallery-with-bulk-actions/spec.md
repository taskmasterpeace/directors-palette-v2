# Multi-Select Gallery with Bulk Actions

## Overview

Add multi-select mode to the unified image gallery with bulk actions toolbar (Download ZIP, Delete Selected, Move to Folder). Enable Shift+click for range selection and Ctrl+click for toggle selection.

## Rationale

The selection pattern exists in usePromptSelection.ts with Set-based tracking and selectAll/toggleSelect callbacks. BulkDownloadService handles ZIP creation. These can be combined with the existing gallery grid for powerful bulk operations.

---
*This spec was created from ideation and is pending detailed specification.*
