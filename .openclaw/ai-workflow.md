# AI Assistant Workflow Guide

Quick reference for AI assistants working on this project.

## Before Starting Work

1. ✅ Read `/CLAUDE.md` for technical guidelines
2. ✅ Read `.openclaw/collaboration-rules.md` for workflow
3. ✅ Understand the monorepo structure
4. ✅ Know the branch protection rules
5. ✅ **Create or get assigned a GitHub Issue FIRST**

## Standard Workflow

### 1. Create GitHub Issue
**CRITICAL: Do this BEFORE writing any code!**

```markdown
"I'll create a GitHub Issue to track this work:

**Title:** [Feature/Fix description]
**Type:** [Feature/Bug/Docs]
**Description:**
- What needs to be done
- Why it's needed
- Proposed approach

Please create this issue on GitHub and assign it. I'll wait for the issue number before starting work."
```

**Wait for human to:**
- Create the issue
- Assign it
- Provide the issue number

### 2. Understand the Task
- Read the GitHub Issue carefully
- Read acceptance criteria
- Ask clarifying questions if needed
- Check existing code and patterns
- Review related documentation

### 3. Plan the Changes
- Identify affected files
- Consider impact on other packages
- Check if it requires human approval
- Plan the implementation approach

### 4. Create Feature Branch

**IMPORTANT: Always pull latest changes first!**

```bash
# 1. Switch to main and pull latest
git checkout main
git pull origin main

# 2. Create your feature branch with issue number
git checkout -b feature/42-descriptive-name
```

**Branch Naming (MUST include issue number):**
- `feature/42-user-auth` - New features
- `fix/15-login-bug` - Bug fixes
- `docs/8-api-guide` - Documentation
- `refactor/23-service-layer` - Refactoring
- `test/19-unit-tests` - Tests

### 5. Make Changes

**Follow Project Conventions:**
- TypeScript for all code
- Tailwind CSS v3 for styling
- Swagger docs for API endpoints
- Proper file organization

**Use Correct Tools:**
- Backend: NestJS patterns
- Frontend: React + Tailwind
- Shared: Pure TypeScript

### 6. Test Your Changes

```bash
# Run dev servers
yarn dev

# Verify:
# - Web: http://localhost:3000
# - API: http://localhost:4000/api
# - Swagger: http://localhost:4000/api/docs
```

Check:
- [ ] No console errors
- [ ] Features work as expected
- [ ] Responsive design (web)
- [ ] API endpoints respond correctly

### 7. Commit Changes

**MUST reference issue number in commit!**

```bash
git add .
git commit -m "type: description (#42)

Detailed explanation of changes
- What was changed
- Why it was changed

Closes #42"
```

**Commit Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

### 8. Push to Remote

```bash
git push origin feature/42-your-branch-name
```

### 9. Inform Human

**NEVER merge yourself - always tell the human:**

> "✅ Changes completed and pushed to branch `feature/42-your-branch-name`
>
> **Next Steps:**
> 1. Create Pull Request from this branch to main
> 2. **Link PR to Issue #42** with "Closes #42" in PR description
> 3. Request review from team member
> 4. Wait for approval before merging
>
> **What Changed:**
> - [Summary of changes]
>
> **Addresses Issue:** #42
>
> **How to Test:**
> - [Testing instructions]
>
> **Acceptance Criteria Met:**
> - [ ] [Criteria from issue]"

## Decision Tree

### Should I Ask for Approval?

**YES - Ask First:**
- ❌ Changing architecture
- ❌ Adding major dependencies
- ❌ Modifying build config
- ❌ Changing package.json workspaces
- ❌ Removing features
- ❌ Breaking changes
- ❌ Security-related changes

**NO - Proceed:**
- ✅ Bug fixes following patterns
- ✅ New features following patterns
- ✅ Documentation updates
- ✅ Code formatting
- ✅ Adding tests

### Can I Push to This Branch?

**YES:**
- ✅ Your own feature branch
- ✅ After creating new branch

**NO:**
- ❌ main / master
- ❌ Other people's branches
- ❌ Any protected branch

### Can I Force-Push?

**YES:**
- ✅ Your own feature branch (with caution)
- ✅ With explicit human approval

**NO:**
- ❌ main / master
- ❌ Shared branches
- ❌ Branches with open PRs (without approval)

## Common Scenarios

### Scenario 1: Simple Bug Fix

```bash
# 0. First, ask human to create issue
"I'll need a GitHub Issue created for this bug fix.
Can you create Issue for: Fix button color in dark theme
I'll wait for the issue number."

# [Human creates Issue #15]

# 1. Pull latest and create branch with issue number
git checkout main
git pull origin main
git checkout -b fix/15-button-color

# 2. Fix the bug
# Edit files...

# 3. Test
yarn dev
# Verify fix works

# 4. Commit with issue reference
git commit -m "fix(web): correct button color in dark theme (#15)

Closes #15"

# 5. Push
git push origin fix/15-button-color

# 6. Tell human
"Bug fix ready for PR
Branch: fix/15-button-color
Closes Issue #15"
```

### Scenario 2: New Feature

```bash
# 0. Request issue creation
"I'll create a plan for the user statistics dashboard.

Please create a GitHub Issue with:
Title: Add user statistics dashboard
Type: Feature
Description: [detailed description]
Acceptance Criteria:
- [ ] Backend endpoint returns stats
- [ ] Frontend displays stats
- [ ] Swagger docs added

I'll wait for the issue number before starting."

# [Human creates Issue #42]

# 1. Pull latest and create branch with issue number
git checkout main
git pull origin main
git checkout -b feature/42-user-stats

# 2. Implement
# - Add backend endpoint with Swagger
# - Create frontend component
# - Update shared types if needed

# 3. Test thoroughly
yarn dev
# Test all aspects

# 4. Commit with issue reference
git commit -m "feat: add user statistics dashboard (#42)

- Added /api/stats endpoint
- Created StatsCard component
- Added UserStats DTO to shared package

Closes #42"

# 5. Push
git push origin feature/42-user-stats

# 6. Inform human with details
"Feature complete - ready for PR
Branch: feature/42-user-stats
Closes Issue #42
All acceptance criteria met"
```

### Scenario 3: Documentation Update

```bash
# 0. Request issue
"Please create Issue for documentation update:
Title: Update installation instructions
Type: Documentation
I'll wait for issue number."

# [Human creates Issue #8]

# 1. Pull latest and create branch
git checkout main
git pull origin main
git checkout -b docs/8-update-readme

# 2. Update docs
# Edit README.md, CLAUDE.md, etc.

# 3. Commit with issue reference
git commit -m "docs: update installation instructions (#8)

Closes #8"

# 4. Push
git push origin docs/8-update-readme

# 5. Tell human
"Documentation updated - PR needed
Branch: docs/8-update-readme
Closes Issue #8"
```

### Scenario 4: Needs Approval

**User asks:** "Should we switch to Tailwind v4?"

**Your response:**
> "⚠️ This requires human approval.
>
> **Considerations:**
> - Tailwind v4 has breaking changes
> - Would require updating all configs
> - May affect existing styles
>
> **Recommendation:**
> Current project uses v3 intentionally. I suggest staying with v3 unless there's a specific v4 feature needed.
>
> **Would you like to:**
> 1. Keep Tailwind v3 (recommended)
> 2. Discuss migration to v4"

## Error Recovery

### Accidentally Pushed to Main

**DON'T PANIC:**
1. Immediately notify human
2. Do NOT push again
3. Let human handle revert
4. Learn from mistake

### Force-Pushed Without Approval

1. Notify human immediately
2. Explain what happened
3. Wait for instructions
4. May need to restore from backup

### Broke the Build

1. Check what went wrong
2. Create hotfix branch
3. Fix the issue
4. Push to hotfix branch
5. Request immediate review

## Best Practices

### Communication

**Be Clear:**
- Explain what you changed
- Explain why you changed it
- Provide testing instructions
- Mention any caveats

**Be Honest:**
- Admit if uncertain
- Ask questions
- Suggest alternatives
- Highlight risks

### Code Quality

**Write:**
- Clean, readable code
- Proper TypeScript types
- Good comments
- Clear variable names

**Follow:**
- Project conventions
- Existing patterns
- Style guidelines
- Documentation standards

### Testing

**Always:**
- Test before pushing
- Check console for errors
- Test edge cases
- Verify responsiveness (web)

**Never:**
- Push untested code
- Skip verification
- Assume it works
- Ignore warnings

## Quick Commands

```bash
# Check current branch
git branch

# Create & switch to new branch
git checkout -b feature/name

# See what changed
git status
git diff

# Stage all changes
git add .

# Commit
git commit -m "type: message"

# Push to remote
git push origin branch-name

# Pull latest from main
git checkout main
git pull origin main

# Return to your branch
git checkout feature/name

# Update your branch with main
git merge main
```

## Resources

- Project docs: `/CLAUDE.md`
- Collaboration rules: `.openclaw/collaboration-rules.md`
- Package docs: `packages/*/README.md`

---

**Remember:** When in doubt, ask the human! It's better to ask than to make assumptions.

**Your role:** Assist and suggest, but humans make final decisions on merges and architectural changes.
