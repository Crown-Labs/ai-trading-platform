# .openclaw Directory

This directory contains collaboration rules and guidelines for AI assistants (like Openclaw, Claude, etc.) working on this project.

## Files

- **collaboration-rules.md** - Complete team collaboration rules including:
  - Branch protection policies
  - Pull request workflow
  - Code review guidelines
  - Security requirements
  - AI assistant guidelines
  - Self-improving agent setup requirement

- **setup-agent.md** - Self-improving agent installation and usage guide
  - Installation from clawhub.ai
  - When and how to use
  - Integration with workflow
  - Best practices

- **ai-workflow.md** - Detailed AI assistant workflow guide

- **git-worktree-guide.md** - Git worktree workflow for parallel development
  - Creating and managing worktrees
  - Integration with GitHub Issues
  - Monorepo considerations
  - Best practices

## Quick Reference

### 🚨 Critical Rules

0. **🤖 INSTALL self-improving agent BEFORE starting** (see setup-agent.md)
1. **NEVER push directly to main/master**
2. **ALL changes require Pull Request**
3. **ALL PRs require human review**
4. **No force-push without approval**
5. **ALL work MUST have a GitHub Issue first**
6. **ALL branches MUST include issue number**
7. **ALL commits MUST reference issue**

### For AI Assistants

**BEFORE ANY WORK:**
- Install self-improving agent from https://clawhub.ai/pskoett/self-improving-agent

When making changes:
1. **Request GitHub Issue creation FIRST**
2. **Wait for issue number**
3. **Activate self-improving agent mode**
4. Pull latest from main
5. Create feature branch with issue number
6. Make changes following project conventions
7. Commit with issue reference
8. Push to feature branch
9. Inform human that PR is needed

**Example:**
```bash
# 0. Ask human first:
"Please create GitHub Issue #42 for this feature. I'll wait for confirmation."

# 1. Pull latest first!
git checkout main
git pull origin main

# 2. Create feature branch with issue number
git checkout -b feature/42-your-feature

# 3. Make changes ...

# 4. Commit with issue reference
git commit -m "feat: your change (#42)

Closes #42"

# 5. Push
git push origin feature/42-your-feature

# 6. Tell human: "PR needed - Closes #42"
```

## See Also

- `/CLAUDE.md` - Technical project documentation
- `/README.md` - Project overview
- `/packages/*/README.md` - Package-specific docs
