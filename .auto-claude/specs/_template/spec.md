# Specification: [Task Name]

## Overview

[One paragraph describing the task and its purpose]

## Workflow Type

**Type**: [feature | refactor | investigation | migration | simple]
**Rationale**: [Why this workflow type was chosen]

## Task Scope

### Services Involved
| Service | Role |
|---------|------|
| frontend | [Description of frontend changes] |
| database | [Description of database changes] |

### Changes Required
- [ ] Change 1
- [ ] Change 2
- [ ] Change 3

### Out of Scope
- Item 1
- Item 2

## Service Context

### Frontend (Next.js)
- Port: 3000
- Start: `npm run dev`
- Build: `npm run build`

### Database (Supabase)
- Project: tarohelkwuurakbxjyxm
- Tables affected: [list tables]

## Files to Modify

| Path | Service | Changes |
|------|---------|---------|
| src/path/to/file.tsx | frontend | Description of changes |
| src/app/api/route.ts | frontend | Description of changes |

## Files to Reference

| Path | Purpose |
|------|---------|
| src/features/example/... | Pattern reference |
| src/components/ui/... | UI component examples |

## Patterns to Follow

### Component Pattern
Reference: `src/features/shot-creator/components/`
- Keep components < 70 lines
- Extract logic to hooks
- Use TypeScript strict mode

### Service Pattern
Reference: `src/features/shot-creator/services/`
- Class-based services
- Dependency injection
- Error handling

## Requirements

### Functional Requirements
1. Requirement 1
2. Requirement 2
3. Requirement 3

### Non-Functional Requirements
1. Performance: [expectations]
2. Security: [considerations]
3. Accessibility: [requirements]

## Implementation Notes

### Approach
[High-level implementation approach]

### Technical Decisions
- Decision 1: [rationale]
- Decision 2: [rationale]

### Edge Cases
- Edge case 1: [how to handle]
- Edge case 2: [how to handle]

## Development Environment

### Prerequisites
- Node.js 18+
- npm/pnpm
- Environment variables configured

### Setup Commands
```bash
npm install
npm run dev
```

### Verification Commands
```bash
npm run build      # Verify build
npm run lint       # Check linting
npm run test:unit  # Run unit tests
```

## Success Criteria

- [ ] Feature works as described
- [ ] No TypeScript errors
- [ ] Build passes
- [ ] Tests pass
- [ ] No regression in existing features

## QA Acceptance Criteria

### Unit Tests
- [ ] Test 1 description
- [ ] Test 2 description

### Integration Tests
- [ ] Test 1 description

### Browser Verification
- [ ] Verify on Chrome
- [ ] Verify on Firefox
- [ ] Verify on Safari
- [ ] Verify mobile responsive

### Database Checks
- [ ] Data persists correctly
- [ ] No orphaned records

---

**Spec Created**: [Date]
**Last Updated**: [Date]
**Status**: [Draft | Ready | In Progress | Complete]
