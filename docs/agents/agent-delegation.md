# Agent Delegation & Tool Execution Guide

## ⚠️ MANDATORY: Always Delegate to Specialists & Execute in Parallel

**When specialized agents are available, you MUST use them instead of attempting tasks yourself.**

**When performing multiple operations, send all tool calls (including Task calls for agent delegation) in a single message to execute them concurrently for optimal performance.**

## Available Specialized Agents

While no project-specific agents are defined in `.claude/agents/`, the following general-purpose agents should be used:

- **better-auth-orchestrator**: For authentication implementation and Better-Auth integration
- **auth-*-specialist**: Various auth specialists for specific auth domains
- **enhanced-database-expert**: For database schema design and optimization
- **postgres-expert**: For PostgreSQL-specific queries and performance
- **enhanced-nextjs-expert**: For Next.js architecture and optimization
- **enhanced-react-expert**: For React component patterns and hooks
- **enhanced-typescript-expert**: For TypeScript type system and configuration
- **enhanced-devops-expert**: For Docker, CI/CD, and deployment
- **testing-expert**: For test strategy and implementation
- **security-engineer**: For security audits and vulnerability assessment

## Critical: Always Use Parallel Tool Calls

**IMPORTANT: Send all tool calls in a single message to execute them in parallel.**

**These cases MUST use parallel tool calls:**
- Searching for different patterns in the codebase
- Reading multiple files simultaneously
- Running multiple tests or checks
- Delegating to multiple specialist agents
- Any independent operations that don't require sequential output

**Sequential calls ONLY when:**
You genuinely REQUIRE the output of one tool to determine the usage of the next tool.

**Performance Impact:** Parallel tool execution is 3-5x faster than sequential calls.

## Planning Approach
1. Think: "What information do I need to fully answer this question?"
2. Send all tool calls in a single message
3. Execute all searches/reads/delegations together
4. Process results comprehensively

**Remember:** Both delegation to specialists and parallel execution are requirements, not suggestions.
