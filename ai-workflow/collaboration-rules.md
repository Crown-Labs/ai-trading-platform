# Team Collaboration Rules - AI Trading Platform

## 🚨 CRITICAL: Branch Protection

**NEVER push directly to master/main — always use feature branch + PR**

**ALL changes require a Pull Request — code, docs, config, everything**

**ALL PRs require human review before merge — no exceptions**

**No force-push to any shared branch without explicit human approval**

## 🎯 CRITICAL: Issue Tracking

**ALL features MUST have a GitHub Issue for planning and implementation**

**NEVER start work without creating or being assigned an issue**

**ALL PRs MUST reference the related issue number**

**Issues MUST be created before branches — no exceptions**

## 🤖 CRITICAL: AI Agent Setup

**BEFORE starting work on this project, AI agents MUST install the self-improving agent**

### Install Self-Improving Agent

**From clawhub.ai:**
```bash
# Install the self-improving agent skill
# Visit: https://clawhub.ai/pskoett/self-improving-agent
```

**Required for:**
- Enhanced code generation and improvement
- Iterative problem solving
- Learning from project patterns
- Self-correction and optimization

**When to use:**
- Before implementing complex features
- During code refactoring
- When encountering difficult problems
- For optimization tasks

**Integration with workflow:**
1. Install self-improving agent before starting work
2. Use agent capabilities throughout development
3. Apply agent insights to improve code quality
4. Document learnings in project memory

---

## Git Workflow

### Branch Strategy

**Protected Branches:**
- `main` / `master` - Production-ready code
- Never commit directly to protected branches
- All changes must go through Pull Request process

**Feature Branches:**
```bash
# Always pull latest first!
git checkout main
git pull origin main

# Then create feature branch
git checkout -b feature/your-feature-name
git checkout -b fix/bug-description
git checkout -b docs/documentation-update
```

**Branch Naming Convention:**
- `feature/<issue-number>-description` - New features (e.g., `feature/42-user-auth`)
- `fix/<issue-number>-description` - Bug fixes (e.g., `fix/15-login-bug`)
- `docs/<issue-number>-description` - Documentation only
- `refactor/<issue-number>-description` - Code refactoring
- `chore/<issue-number>-description` - Maintenance tasks
- `test/<issue-number>-description` - Test additions or modifications

**Branch names MUST include issue number!**

### Git Worktree (Optional but Recommended)

**Use git worktree for parallel work:**

Git worktree allows multiple working directories for the same repository - work on multiple features without switching branches.

**Quick Usage:**
```bash
# Create worktree for issue #42
git worktree add ../ai-trading-platform-feature-42 -b feature/42-description

# Navigate and work
cd ../ai-trading-platform-feature-42
yarn install
yarn dev

# After PR merged, cleanup
cd ~/ai-trading-platform
git worktree remove ../ai-trading-platform-feature-42
```

**Advantages:**
- Work on multiple issues simultaneously
- No need to stash changes
- Quick context switching
- Test different approaches in parallel

**See detailed guide:** `.openclaw/git-worktree-guide.md`

### Issue-Driven Development

**ALL work must start with a GitHub Issue:**

1. **Create Issue First**
   - Go to GitHub Issues
   - Click "New Issue"
   - Choose appropriate template (Feature/Bug/Documentation)
   - Fill in all required fields:
     - Clear title
     - Detailed description
     - Acceptance criteria
     - Labels (feature/bug/docs/etc.)
     - Milestone (if applicable)

2. **Issue Content Requirements**
   - **What**: What needs to be done
   - **Why**: Why it's needed
   - **How**: Proposed approach (can be discussed)
   - **Acceptance Criteria**: How to verify it's done
   - **Tasks**: Checklist of steps (optional)

3. **Get Issue Approved**
   - Discuss in issue comments if needed
   - Get approval from team lead/maintainer
   - Issue will be assigned to you

4. **Start Work**
   - Only start after issue is approved and assigned
   - Reference issue number in branch name
   - Reference issue number in commits

**Example Issue:**
```markdown
Title: Add user authentication endpoint

## Description
Need to implement user authentication using JWT tokens.

## Why
Users need to log in to access their trading dashboard.

## Proposed Approach
- Create /api/auth/login endpoint
- Implement JWT token generation
- Add authentication guard

## Acceptance Criteria
- [ ] Login endpoint works with email/password
- [ ] Returns valid JWT token
- [ ] Token can be validated
- [ ] Swagger documentation added

## Labels
`feature`, `backend`, `priority:high`
```

### Pull Request Process

1. **Create or Get Assigned Issue** (Do this FIRST!)
   - Create GitHub Issue or get assigned existing one
   - Wait for approval if new issue
   - Note the issue number (e.g., #42)

2. **Pull Latest & Create Feature Branch**
   ```bash
   # Pull latest changes from main
   git checkout main
   git pull origin main

   # Create your feature branch with issue number
   git checkout -b feature/42-user-authentication
   ```

3. **Make Changes & Commit** (Reference issue in commits)
   ```bash
   git add .
   git commit -m "feat: add user authentication endpoint (#42)

   - Implemented JWT token generation
   - Added login endpoint
   - Created auth guard

   Closes #42"
   ```

4. **Push to Remote**
   ```bash
   git push origin feature/42-user-authentication
   ```

5. **Create Pull Request**
   - Use GitHub PR interface
   - Fill out PR template completely
   - Add descriptive title and description
   - **MUST link related issue:** "Closes #42" or "Fixes #42"
   - PR title format: `feat: add user authentication (#42)`

6. **Code Review**
   - Request review from team members
   - Address all review comments
   - Make requested changes
   - Re-request review after changes

7. **Merge Requirements**
   - ✅ All tests passing
   - ✅ At least one human approval
   - ✅ No merge conflicts
   - ✅ Branch up-to-date with main
   - ✅ All review comments resolved
   - ✅ Issue is referenced in PR
   - ✅ Acceptance criteria met

8. **Merge & Cleanup**
   ```bash
   # After PR is merged
   git checkout main
   git pull origin main
   git branch -d feature/new-feature
   ```

### Commit Message Standards

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```bash
feat(backend): add user authentication endpoint
fix(web): resolve mobile navigation menu issue
docs(readme): update installation instructions
refactor(shared): simplify utility functions
test(backend): add unit tests for trading service
```

**Multi-line Commits:**
For detailed commits:
```
feat: add new feature

Detailed description of what was implemented
and why it was needed.

Closes #42
```

---

## Code Review Guidelines

### For Authors

**Before Creating PR:**
- ✅ Run `yarn dev` and test locally
- ✅ Ensure no console errors
- ✅ Test on multiple screen sizes (web)
- ✅ Verify API endpoints work (backend)
- ✅ Run linter and fix issues
- ✅ Update documentation if needed

**PR Description Must Include:**
- What changes were made
- Why changes were necessary
- How to test the changes
- Screenshots (for UI changes)
- Any breaking changes
- Related issue numbers

**During Review:**
- Respond to all comments
- Ask questions if feedback is unclear
- Make requested changes promptly
- Re-request review after updates
- Be open to suggestions

### For Reviewers

**Review Checklist:**
- [ ] Code follows project conventions
- [ ] TypeScript types are properly used
- [ ] Swagger documentation added (backend)
- [ ] Components follow design system (web)
- [ ] No unnecessary dependencies added
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Error handling implemented
- [ ] Code is readable and maintainable

**Review Focus Areas:**
1. **Architecture** - Does it fit the project structure?
2. **Code Quality** - Is it clean, readable, maintainable?
3. **Testing** - Are edge cases handled?
4. **Security** - Any vulnerabilities introduced?
5. **Performance** - Any bottlenecks?
6. **Documentation** - Is it well documented?

**Providing Feedback:**
- Be constructive and specific
- Explain the "why" behind suggestions
- Distinguish between blocking issues and suggestions
- Use GitHub's review features:
  - `Comment` - Questions or suggestions
  - `Request changes` - Blocking issues
  - `Approve` - Ready to merge

---

## Development Standards

### Package Management

**MUST:**
- Use `yarn` exclusively (never npm or pnpm)
- Maintain yarn workspaces structure
- Add dependencies to correct package
- Run `yarn install` at root after adding dependencies

**Adding Dependencies:**
```bash
# Root workspace
yarn add -W <package>

# Specific package
yarn workspace @ai-trading/web add <package>
yarn workspace @ai-trading/backend add <package>

# Dev dependencies
yarn workspace @ai-trading/web add -D <package>
```

**NEVER:**
- Mix package managers (no package-lock.json or pnpm-lock.yaml)
- Install dependencies globally
- Modify package.json manually without running yarn

### Testing Requirements

**Before Pushing:**
1. Run development servers: `yarn dev`
2. Test web interface: http://localhost:3000
3. Test API endpoints: http://localhost:4000/api
4. Check Swagger docs: http://localhost:4000/api/docs
5. Verify console has no errors
6. Test on mobile viewport (web)

**Before Creating PR:**
- All manual testing complete
- No breaking changes to existing features
- Backward compatibility maintained
- Edge cases considered

### Code Quality

**TypeScript:**
- No `any` types without justification
- Proper interfaces for all data structures
- Use type inference where appropriate
- Export types from shared package

**Backend (NestJS):**
- All endpoints have Swagger decorators
- DTOs for all request/response data
- Proper error handling
- Input validation

**Frontend (React):**
- Components in `components/` folder
- TypeScript interfaces for props
- Tailwind CSS for styling only
- No inline styles or CSS modules

---

## Security & Safety

### Protected Operations

**ALWAYS Require Human Approval For:**
- Force-pushing to any shared branch
- Deleting branches (except your own feature branches)
- Modifying CI/CD configuration
- Changing environment variables
- Adding new external services
- Database schema changes
- Modifying package.json workspaces
- Changing build configuration

### Code Security

**NEVER Commit:**
- API keys or secrets
- Environment files (.env)
- Credentials or passwords
- Private keys
- Access tokens
- Personal data

**DO Commit:**
- Example env files (.env.example)
- Public configuration
- Documentation
- Code and tests

**Security Checklist:**
- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] SQL injection prevention (when using DB)
- [ ] XSS prevention
- [ ] CSRF protection (if needed)

---

## Communication

### When to Ask Questions

**ALWAYS Ask Before:**
- Making architectural changes
- Adding major dependencies
- Changing tech stack
- Modifying project structure
- Removing existing features
- Breaking API changes

**Feel Free To Proceed:**
- Bug fixes
- Adding new features (following patterns)
- Improving documentation
- Refactoring (without changing behavior)
- Adding tests

### PR Communication

**Use PR Comments For:**
- Explaining complex changes
- Asking for specific feedback
- Highlighting potential issues
- Requesting additional review

**Use Issues For:**
- Bug reports
- Feature requests
- Architecture discussions
- Planning major changes

---

## Emergency Procedures

### Broken Main Branch

If main/master is broken:

1. **DO NOT push more changes**
2. Create hotfix branch: `git checkout -b hotfix/critical-fix`
3. Fix the issue
4. Create PR with `HOTFIX:` prefix in title
5. Request immediate review
6. Merge after approval

### Reverting Changes

If a merged PR causes issues:

1. **DO NOT force-push**
2. Create revert PR:
   ```bash
   git revert <commit-hash>
   git push origin revert/description
   ```
3. Follow normal PR process
4. Explain what went wrong and why reverting

### Force Push Policy

**NEVER force-push to:**
- `main` / `master`
- Any shared branch
- Any branch with open PRs

**Only force-push to:**
- Your own feature branches
- With explicit human approval
- After communicating with team

---

## AI Assistant Guidelines

### For AI Assistants (Claude, Openclaw, etc.)

**YOU MUST:**
- Follow all branch protection rules
- Never push directly to main/master
- Always create feature branches
- Mention need for PR in responses
- Respect human review requirements

**YOU MUST NOT:**
- Bypass PR process
- Force-push without approval
- Merge PRs (only humans can merge)
- Make architectural changes without asking
- Modify protected files without approval

**When Making Changes:**
1. Create feature branch
2. Make changes following project conventions
3. Commit with proper message format
4. Push to feature branch
5. Inform human that PR is needed
6. Wait for human review and merge

**Example Workflow:**
```bash
# Pull latest changes first
git checkout main
git pull origin main

# Create feature branch (with issue number)
git checkout -b feature/42-improve-error-handling

# Make changes, then commit
git add .
git commit -m "feat: improve error handling (#42)

Added try-catch blocks for API calls
Improved error messages for better UX

Closes #42"

# Push to remote
git push origin feature/42-improve-error-handling

# Inform human:
"Changes committed to feature/42-improve-error-handling branch.
Please create a PR and request review before merging to main."
```

---

## Project-Specific Rules

### Monorepo Structure

**NEVER:**
- Change workspace configuration in root package.json
- Move packages outside `packages/` folder
- Rename package workspace names
- Modify yarn workspaces setup

**ALWAYS:**
- Keep packages in their designated folders
- Use workspace dependencies (@ai-trading/*)
- Run commands from root when possible

### Technology Stack

**Backend Must:**
- Use NestJS framework
- Include Swagger documentation
- Follow existing module structure
- Use DTOs for all endpoints

**Frontend Must:**
- Use React with TypeScript
- Style with Tailwind CSS v3 only
- Follow existing component patterns
- Maintain dark theme design

**Shared Package:**
- Export through index.ts
- Use TypeScript
- No React or NestJS specific code
- Pure utilities and types only

### Dependencies

**Before Adding Dependencies:**
- Check if functionality exists in current stack
- Consider bundle size impact
- Verify license compatibility
- Ensure active maintenance
- Get approval for major libraries

**Forbidden:**
- Changing Tailwind to v4
- Switching from yarn to npm/pnpm
- Adding CSS-in-JS libraries
- Changing from NestJS to another framework

---

## Enforcement

### Automated Checks

Configure repository to enforce:
- Branch protection on main/master
- Require PR reviews
- Require passing tests (when implemented)
- Prevent force-push
- Require linear history

### Human Oversight

**Team Lead / Maintainer Responsibilities:**
- Review all PRs
- Enforce collaboration rules
- Make final merge decisions
- Handle exceptions
- Update rules as needed

### Consequences

**Violations:**
- Direct push to main → Immediate revert + warning
- Force-push without approval → Immediate revert + team discussion
- Bypassing review → PR closed, re-submit properly
- Repeated violations → Escalate to team lead

---

## Questions & Support

**For Questions About:**
- **Project Structure** → See `/CLAUDE.md`
- **Collaboration Rules** → This document
- **Technical Issues** → Create GitHub issue
- **Urgent Matters** → Contact team lead

**Document Updates:**
- Propose changes via PR
- Discuss in team meeting
- Document must be approved before changes

---

**Version:** 1.0.0
**Last Updated:** 2026-03-23
**Next Review:** 2026-04-23

**Maintained By:** Development Team
**Enforced By:** All team members and AI assistants
