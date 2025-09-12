# Phase 3b Handoff Document - Better Auth Agent Splitting

## CRITICAL CONTEXT FOR CONTINUATION

### Current Status
- **Date**: 2025-01-11
- **Phase**: 3b ready to begin
- **Completed**: 11 of ~15 agent splits
- **Total Agents**: 20 (up from 10)

### Completed Work Summary
✅ **Phase 1**: Split auth-core-specialist (3,520 lines) → 5 agents
✅ **Phase 2**: Split auth-security-specialist (2,032 lines) → 3 agents  
✅ **Phase 3a**: Split auth-database-specialist (1,835 lines) → 3 agents

### IMMEDIATE NEXT TASKS FOR PHASE 3B

#### 1. Split auth-plugin-specialist.md (1,751 lines)
**Source**: `/docs/project_context/agents/better-auth/large-fullsized-subagents/auth-plugin-specialist.md`
**Target Split** (3 agents):
- **auth-2fa-specialist.md** (~600 lines)
  - Two-factor authentication (TOTP, SMS, email)
  - 2FA setup and verification flows
  - Recovery codes and backup methods
- **auth-passwordless-specialist.md** (~600 lines)
  - Magic links and email OTP
  - Passkey/WebAuthn configuration
  - Passwordless authentication flows
- **auth-plugin-dev-specialist.md** (~550 lines)
  - Custom plugin development
  - Plugin architecture and patterns
  - OpenAPI documentation generation

#### 2. Split auth-integration-specialist.md (1,716 lines)
**Source**: `/docs/project_context/agents/better-auth/large-fullsized-subagents/auth-integration-specialist.md`
**Target Split** (2 agents):
- **auth-oauth-specialist.md** (~850 lines)
  - OAuth provider configuration
  - Provider-specific setups
  - OAuth flows and account linking
- **auth-social-specialist.md** (~850 lines)
  - Social provider implementations
  - Provider-specific configurations
  - Social authentication patterns

### Files to Update After Each Split
1. **Orchestrator**: `/docs/project_context/agents/better-auth/better-auth-orchestrator.md`
   - Update routing patterns for new agents
   - Replace old agent references
2. **README**: `/docs/project_context/agents/better-auth/README.md`
   - Add new agents with proper numbering
   - Update version history
3. **Summary**: `/docs/project_context/agents/better-auth/AGENT_SPLITTING_SUMMARY.md`
   - Update progress tracking

### Key Patterns to Follow

#### YAML Frontmatter Template
```yaml
---
name: auth-[specialist-name]-specialist
description: PROACTIVELY use for [specific domain]. Expert in [key areas].
tools: Read, Write, Edit, MultiEdit, Bash, Grep
---
```

#### Target Sizes
- Primary target: 600-700 lines
- Acceptable range: 500-800 lines
- If exceeding 800, consider further splitting

### Working Directory Structure
```
/docs/project_context/agents/better-auth/
├── large-fullsized-subagents/     # Original large agents (DO NOT EDIT)
│   ├── auth-plugin-specialist.md   # 1,751 lines - NEXT TO SPLIT
│   └── auth-integration-specialist.md # 1,716 lines - SPLIT AFTER PLUGIN
├── [new split agents go here]      # Target directory for new agents
├── better-auth-orchestrator.md     # Update after each split
├── README.md                        # Update after each split
└── AGENT_SPLITTING_SUMMARY.md      # Update after each split
```

### Agent Numbering Status
Current count: 20 agents
- Agents 1-5: Core splits (setup, client, server, typescript, config)
- Agents 6: Integration (still large - to be split in Phase 3b)
- Agents 7-9: Security splits (jwt, protection, password)
- Agent 10: Plugin (still large - to be split in Phase 3b)
- Agents 11-13: Database splits (schema, adapter, db-performance)
- Agents 14-18: Other specialists (provider, oidc, admin, organization, sso)

After Phase 3b completion, expect ~25 total agents.

### Critical Commands for Phase 3b

```bash
# Use documentation-expert agent for splitting
@agent-documentation-expert

# Read source file first
Read /docs/project_context/agents/better-auth/large-fullsized-subagents/auth-plugin-specialist.md

# Create splits with proper YAML frontmatter
Write /docs/project_context/agents/better-auth/auth-2fa-specialist.md
Write /docs/project_context/agents/better-auth/auth-passwordless-specialist.md
Write /docs/project_context/agents/better-auth/auth-plugin-dev-specialist.md

# Update orchestrator routing
Edit /docs/project_context/agents/better-auth/better-auth-orchestrator.md

# Update README
Edit /docs/project_context/agents/better-auth/README.md
```

### Success Criteria for Phase 3b
✅ Split auth-plugin-specialist into 3 agents
✅ Split auth-integration-specialist into 2 agents
✅ All new agents between 500-800 lines (target 600-700)
✅ Orchestrator updated with new routing patterns
✅ README updated with proper numbering
✅ No content lost from original agents
✅ Proper YAML frontmatter on all new agents

### DO NOT FORGET
- Keep original agents in large-fullsized-subagents/ untouched
- Create new agents in main better-auth/ directory
- Update orchestrator after EACH agent split
- Maintain consistent naming: auth-[domain]-specialist.md
- Preserve ALL content - no information should be lost

---

**READY FOR HANDOFF**: This document contains everything needed to continue Phase 3b immediately after /compact.