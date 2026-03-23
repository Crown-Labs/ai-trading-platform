# Git Worktree Workflow Guide

This guide explains how to use git worktree effectively with the AI Trading Platform monorepo.

## What is Git Worktree?

Git worktree allows multiple working directories for the same repository, enabling you to:
- Work on multiple features simultaneously
- Keep long-running work separate
- Quickly switch contexts without stashing
- Test different approaches in parallel

## Quick Start

```bash
# 1. Create worktree for new feature
git worktree add ../ai-trading-platform-feature-42 -b feature/42-description

# 2. Navigate and setup
cd ../ai-trading-platform-feature-42
yarn install

# 3. Work normally
yarn dev
# Make changes...

# 4. Commit and push
git commit -m "feat: description (#42)"
git push origin feature/42-description

# 5. Clean up after merge
cd ../ai-trading-platform
git worktree remove ../ai-trading-platform-feature-42
```

## Integration with Collaboration Rules

### Complete Workflow with Worktree

```bash
# 0. Install self-improving agent (first time only)

# 1. Human creates GitHub Issue #42

# 2. From main repository, ensure latest
cd ~/ai-trading-platform
git checkout main
git pull origin main

# 3. Create worktree with issue number in branch name
git worktree add ../ai-trading-platform-feature-42 -b feature/42-user-authentication

# 4. Setup worktree
cd ../ai-trading-platform-feature-42
yarn install

# 5. Activate self-improving agent mode
# [agent activation command]

# 6. Develop
yarn dev
# Make changes...

# 7. Commit with issue reference
git add .
git commit -m "feat: add user authentication (#42)

- Implemented JWT tokens
- Added auth guard
- Created login endpoint

Closes #42"

# 8. Push to remote
git push origin feature/42-user-authentication

# 9. Inform human
"PR ready for feature/42-user-authentication
Closes Issue #42"

# 10. After PR merged, cleanup
cd ~/ai-trading-platform
git checkout main
git pull origin main
git worktree remove ../ai-trading-platform-feature-42
```

## Worktree Naming Convention

**Pattern:** `../ai-trading-platform-<type>-<issue-number>`

**Examples:**
```bash
# Features
git worktree add ../ai-trading-platform-feature-42 -b feature/42-description

# Bug fixes
git worktree add ../ai-trading-platform-fix-15 -b fix/15-description

# Documentation
git worktree add ../ai-trading-platform-docs-8 -b docs/8-description

# Refactoring
git worktree add ../ai-trading-platform-refactor-23 -b refactor/23-description
```

**Why this pattern?**
- Clear parent directory name
- Easy to identify in file system
- Matches branch naming convention
- Includes issue number for tracking

## Working with Multiple Worktrees

### Scenario: Multiple Features in Parallel

```bash
# Feature 42 (in progress)
git worktree add ../ai-trading-platform-feature-42 -b feature/42-auth
cd ../ai-trading-platform-feature-42
yarn install
yarn dev  # Ports 3000, 4000

# Feature 43 (new work)
cd ~/ai-trading-platform
git worktree add ../ai-trading-platform-feature-43 -b feature/43-dashboard

# ⚠️ Can't run both dev servers on same ports!
# Solution: Use different ports for second worktree
cd ../ai-trading-platform-feature-43
yarn install
PORT=3001 yarn web dev &
PORT=4001 yarn backend dev &
```

### Scenario: Urgent Hotfix While Working

```bash
# Currently working on feature/42
cd ~/ai-trading-platform-feature-42
# Work in progress, don't want to commit yet

# Urgent bug fix needed
cd ~/ai-trading-platform
git worktree add ../ai-trading-platform-hotfix-15 -b fix/15-critical-bug

cd ../ai-trading-platform-hotfix-15
yarn install
# Fix bug, commit, push, PR

# After hotfix merged
cd ~/ai-trading-platform
git worktree remove ../ai-trading-platform-hotfix-15

# Continue with original work
cd ~/ai-trading-platform-feature-42
# Continue where you left off
```

### Scenario: Testing Different Approaches

```bash
# Try two different implementations
git worktree add ../ai-trading-platform-feature-42-approach-a -b feature/42-approach-a
git worktree add ../ai-trading-platform-feature-42-approach-b -b feature/42-approach-b

# Implement both, test, choose best one
# Delete the worktree for the approach you don't use
```

## Monorepo-Specific Considerations

### 1. Each Worktree is Independent

```bash
# Each worktree needs:
cd ../ai-trading-platform-feature-42
yarn install              # Install dependencies
yarn backend build        # Build if needed
yarn dev                  # Run dev servers
```

### 2. Shared Dependencies (node_modules)

**DO NOT share node_modules between worktrees**
- Each worktree has its own `node_modules`
- Prevents version conflicts
- Isolated environments

```bash
# ✅ Correct
cd ../ai-trading-platform-feature-42
yarn install  # Own node_modules

# ❌ Wrong
ln -s ~/ai-trading-platform/node_modules ./node_modules  # Don't do this
```

### 3. Port Management

**Default ports:**
- Web: 3000
- API: 4000

**Running multiple worktrees:**
```bash
# Worktree 1 (use defaults)
cd ../ai-trading-platform-feature-42
yarn dev

# Worktree 2 (change ports)
cd ../ai-trading-platform-feature-43
PORT=3001 yarn web dev &
PORT=4001 yarn backend dev &

# Worktree 3 (change ports)
cd ../ai-trading-platform-fix-15
PORT=3002 yarn web dev &
PORT=4002 yarn backend dev &
```

### 4. Build Artifacts

**Separate build outputs:**
- Each worktree has own `dist/` folder
- Each worktree has own `.next/` or build cache
- Prevents conflicts

## Managing Worktrees

### List All Worktrees

```bash
git worktree list

# Output:
# /Users/user/ai-trading-platform                    abc123 [main]
# /Users/user/ai-trading-platform-feature-42         def456 [feature/42-auth]
# /Users/user/ai-trading-platform-fix-15             ghi789 [fix/15-bug]
```

### Remove Worktree

```bash
# Method 1: Remove command
git worktree remove ../ai-trading-platform-feature-42

# Method 2: Delete manually then prune
rm -rf ../ai-trading-platform-feature-42
git worktree prune
```

### Move Worktree

```bash
# If you need to relocate
git worktree move ../ai-trading-platform-feature-42 /new/path/feature-42
```

### Lock Worktree

```bash
# Prevent accidental removal
git worktree lock ../ai-trading-platform-feature-42

# Unlock
git worktree unlock ../ai-trading-platform-feature-42
```

## Best Practices

### ✅ Do's

1. **One worktree per issue/feature**
   ```bash
   git worktree add ../ai-trading-platform-feature-42 -b feature/42-auth
   ```

2. **Pull latest before creating worktree**
   ```bash
   git checkout main
   git pull origin main
   git worktree add ...
   ```

3. **Clean up after merge**
   ```bash
   git worktree remove ../ai-trading-platform-feature-42
   ```

4. **Use clear naming**
   ```bash
   # Good
   ../ai-trading-platform-feature-42

   # Bad
   ../temp
   ../test
   ```

5. **Keep main in original directory**
   ```bash
   # Main repo
   ~/ai-trading-platform  # Keep this as main

   # Worktrees
   ~/ai-trading-platform-feature-42
   ~/ai-trading-platform-fix-15
   ```

### ❌ Don'ts

1. **Don't create worktree for main/master**
   ```bash
   # ❌ Don't do this
   git worktree add ../ai-trading-platform-main -b main
   ```

2. **Don't forget to install dependencies**
   ```bash
   # ❌ Missing step
   cd ../ai-trading-platform-feature-42
   yarn dev  # Will fail without node_modules

   # ✅ Correct
   cd ../ai-trading-platform-feature-42
   yarn install
   yarn dev
   ```

3. **Don't leave old worktrees**
   ```bash
   # Clean up regularly
   git worktree list
   git worktree remove <old-worktrees>
   ```

4. **Don't modify same branch in multiple worktrees**
   ```bash
   # ❌ Don't do this
   # Worktree 1: feature/42-auth
   # Worktree 2: feature/42-auth (same branch!)
   ```

## Troubleshooting

### Issue: "fatal: 'feature/42' is already checked out"

**Problem:** Branch already exists in another worktree

**Solution:**
```bash
# List worktrees to find it
git worktree list

# Remove old worktree
git worktree remove <path>

# Or use different branch name
git worktree add ../ai-trading-platform-feature-42-v2 -b feature/42-v2
```

### Issue: Port already in use

**Problem:** Another worktree is using ports 3000/4000

**Solution:**
```bash
# Use different ports
PORT=3001 yarn web dev
PORT=4001 yarn backend dev
```

### Issue: node_modules errors

**Problem:** Dependencies not installed

**Solution:**
```bash
cd <worktree>
rm -rf node_modules
yarn install
```

### Issue: Git operations slow

**Problem:** Too many worktrees

**Solution:**
```bash
# Clean up unused worktrees
git worktree list
git worktree remove <unused-worktrees>
git worktree prune
```

## Advanced Usage

### Create Worktree from Existing Branch

```bash
# If branch already exists remotely
git fetch origin
git worktree add ../ai-trading-platform-feature-42 feature/42-auth
```

### Create Detached HEAD Worktree

```bash
# For testing specific commit
git worktree add --detach ../test-worktree abc123
```

### Orphan Branch Worktree

```bash
# For gh-pages or docs
git worktree add ../ai-trading-platform-docs --orphan docs
```

## Integration with Tools

### VS Code

```bash
# Open worktree in new VS Code window
code ../ai-trading-platform-feature-42
```

### Terminal

```bash
# Alias for quick navigation
alias wt-42='cd ../ai-trading-platform-feature-42'
alias wt-main='cd ~/ai-trading-platform'

# Use
wt-42  # Jump to feature 42 worktree
```

## Workflow Scripts

### Create Worktree Script

```bash
#!/bin/bash
# create-worktree.sh

ISSUE_NUM=$1
DESCRIPTION=$2
TYPE=${3:-feature}

if [ -z "$ISSUE_NUM" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: ./create-worktree.sh <issue-num> <description> [type]"
  echo "Example: ./create-worktree.sh 42 user-auth feature"
  exit 1
fi

# Ensure on main and updated
git checkout main
git pull origin main

# Create worktree
WORKTREE_PATH="../ai-trading-platform-${TYPE}-${ISSUE_NUM}"
BRANCH_NAME="${TYPE}/${ISSUE_NUM}-${DESCRIPTION}"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"

# Setup
cd "$WORKTREE_PATH"
yarn install

echo "✅ Worktree created: $WORKTREE_PATH"
echo "📝 Branch: $BRANCH_NAME"
echo "🚀 Run: cd $WORKTREE_PATH && yarn dev"
```

### Cleanup Script

```bash
#!/bin/bash
# cleanup-worktrees.sh

# Remove all worktrees except main
git worktree list | grep -v "$(git rev-parse --show-toplevel)" | \
  awk '{print $1}' | \
  xargs -I {} git worktree remove {}

# Prune
git worktree prune

echo "✅ All worktrees cleaned up"
```

## Summary

**Git worktree is perfect for:**
- ✅ Working on multiple issues simultaneously
- ✅ Quick context switching
- ✅ Testing different approaches
- ✅ Urgent fixes without disturbing current work

**Key points:**
- One worktree per issue
- Follow naming convention
- Install dependencies in each
- Clean up after merging
- Mind the ports when running multiple dev servers

---

**See Also:**
- `.openclaw/collaboration-rules.md` - Branch protection and PR rules
- `.openclaw/ai-workflow.md` - AI assistant workflow
- Git Worktree Documentation: https://git-scm.com/docs/git-worktree
