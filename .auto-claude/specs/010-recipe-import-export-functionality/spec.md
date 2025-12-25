# Recipe Import/Export Functionality

## Overview

Add JSON import and export capabilities for recipes, allowing users to backup, share, and transfer their custom recipes between accounts or installations.

## Rationale

The exact pattern exists in usePromptImportExport.ts for prompts - exports to JSON with version/timestamp, imports with validation and duplicate checking. Recipes are stored in recipe.store.ts with full CRUD but lack this backup/sharing capability.

---
*This spec was created from ideation and is pending detailed specification.*
