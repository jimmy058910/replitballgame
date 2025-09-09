# Design Review Slash Command Configuration

**Claude Code slash command for automated design reviews**

## Command Configuration

**Command Name:** `design-review`

**Description:** Complete a design review of the pending changes on the current branch

**Allowed Tools:**
- Bash
- Read
- Glob
- Grep
- Edit
- MultiEdit
- Write
- WebFetch
- Task
- TodoWrite
- ExitPlanMode
- BashOutput
- KillBash
- mcp__ide__getDiagnostics
- mcp__ide__executeCode
- mcp__playwright__browser_close
- mcp__playwright__browser_resize
- mcp__playwright__browser_console_messages
- mcp__playwright__browser_handle_dialog
- mcp__playwright__browser_evaluate
- mcp__playwright__browser_file_upload
- mcp__playwright__browser_fill_form
- mcp__playwright__browser_install
- mcp__playwright__browser_press_key
- mcp__playwright__browser_type
- mcp__playwright__browser_navigate
- mcp__playwright__browser_navigate_back
- mcp__playwright__browser_network_requests
- mcp__playwright__browser_take_screenshot
- mcp__playwright__browser_snapshot
- mcp__playwright__browser_click
- mcp__playwright__browser_drag
- mcp__playwright__browser_hover
- mcp__playwright__browser_select_option
- mcp__playwright__browser_tabs
- mcp__playwright__browser_wait_for

## Workflow Steps

### Phase 1: Git Analysis
1. **Retrieve Git Status**
   ```bash
   git status
   ```

2. **List Modified Files**
   ```bash
   git diff --name-only HEAD~1 HEAD
   ```

3. **Show Recent Commits**
   ```bash
   git log --oneline -5
   ```

4. **Generate Diff Content**
   ```bash
   git diff HEAD~1 HEAD
   ```

### Phase 2: Design Review Execution

**Objective:** Conduct thorough design review using specialized design review agent, following design principles and style guide from context documents.

**Agent Instructions:**
```
You are now acting as the Design Review Agent for Realm Rivalry. 

Please conduct a comprehensive design review of the changes identified in the git analysis above.

**Key Focus Areas:**
1. Mobile-first functionality (test 375px viewport first)
2. Credit display format compliance ("amount₡" - NEVER "₡amount")
3. 5-hub navigation architecture
4. Accessibility compliance (WCAG AA)
5. Fantasy sports UI authenticity
6. Touch target sizing (≥44px)

**Review Process:**
1. Navigate to http://localhost:5173
2. Check console for errors
3. Test across multiple viewports (mobile, tablet, desktop)
4. Validate against /context/design-principles.md standards
5. Check adherence to /context/style-guide.md
6. Screenshot evidence for issues found
7. Generate detailed report with prioritized findings

**Report Structure:**
- Executive Summary
- Tested Environments
- Blockers (🚨)
- High Priority Issues (🔴)  
- Medium Priority Issues (🟡)
- Nitpicks (🔵)
- Strengths (✅)
- Evidence Screenshots
- Actionable Recommendations

Please begin the review now, starting with environment setup and navigation.
```

### Phase 3: Action Planning

**Post-Review Tasks:**
1. Create TodoWrite items for any blockers found
2. Prioritize fixes based on user impact
3. Document any design system updates needed
4. Plan testing validation for fixes

## Usage Examples

### Basic Usage
```bash
/design-review
```

### With Specific Focus
```bash
/design-review
Focus on the dashboard changes I made, particularly the credit display formatting and mobile navigation.
```

### After Major UI Changes
```bash
/design-review  
I just updated the entire roster management interface. Please pay special attention to the 5-hub navigation integration and touch target sizing.
```

## Integration Notes

**Prerequisites:**
- Development server running (`npm run dev:local`)
- Local environment accessible at `http://localhost:5173`
- Context files present:
  - `/context/design-principles.md`
  - `/context/style-guide.md`

**Expected Workflow:**
1. Make UI changes
2. Commit changes to git
3. Run `/design-review` slash command
4. Address any blockers or high-priority issues found
5. Re-run review if needed to validate fixes

**Performance:**
- Review typically takes 3-5 minutes for comprehensive analysis
- Covers multiple viewports and accessibility checks
- Generates actionable, prioritized feedback

## Customization Options

**Viewport Testing:**
- Default: Mobile (375x667), Tablet (768x1024), Desktop (1920x1080)
- Can be customized based on project needs

**Focus Areas:**
- Customize based on specific feature types
- Add game-specific validation for fantasy sports elements
- Include performance testing for complex interactions

**Reporting Format:**
- Standard format includes all priority levels
- Can be customized for specific team preferences
- Screenshots automatically captured for visual issues

---

**This slash command provides instant access to professional-grade design review capabilities, ensuring consistent UI quality throughout development.**

*Command Version: 1.0 - Optimized for Realm Rivalry*