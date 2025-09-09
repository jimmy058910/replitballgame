# Comprehensive Design Review

**Command:** `/design-review`

**Description:** Execute a complete design review of the current development environment using Playwright automation with mobile-first testing.

**Allowed Tools:**
- mcp__playwright__browser_navigate
- mcp__playwright__browser_resize
- mcp__playwright__browser_console_messages
- mcp__playwright__browser_take_screenshot
- mcp__playwright__browser_snapshot
- mcp__playwright__browser_click
- mcp__playwright__browser_hover
- TodoWrite
- Read

## Workflow Steps

### Phase 1: Environment Setup
1. **Load Design Standards**
   - Read `/context/design-principles.md`
   - Read `/context/style-guide.md`
   - Load current git changes for context

2. **Navigate to Development Site**
   ```bash
   mcp__playwright__browser_navigate http://localhost:5173
   ```

3. **Initial Console Check**
   ```bash
   mcp__playwright__browser_console_messages
   ```

### Phase 2: Multi-Viewport Testing

**Mobile First (iPhone SE - 375x667):**
```bash
mcp__playwright__browser_resize 375 667
mcp__playwright__browser_take_screenshot mobile-review.png
```
- Verify 5-hub navigation works
- Check touch target sizes (≥44px)
- Validate credit formatting ("amount₡")
- Test thumb-zone accessibility

**Mobile Large (iPhone 11 - 414x896):**
```bash
mcp__playwright__browser_resize 414 896
mcp__playwright__browser_take_screenshot mobile-large-review.png
```
- Confirm layout scaling
- Verify safe area handling
- Test landscape compatibility

**Tablet (iPad - 768x1024):**
```bash
mcp__playwright__browser_resize 768 1024
mcp__playwright__browser_take_screenshot tablet-review.png
```
- Check progressive enhancement
- Validate touch/mouse compatibility
- Test multi-column layouts

**Desktop (1920x1080):**
```bash
mcp__playwright__browser_resize 1920 1080
mcp__playwright__browser_take_screenshot desktop-review.png
```
- Validate desktop enhancements
- Check keyboard navigation
- Test hover states

### Phase 3: Interaction Testing
1. **Navigation Testing**
   - Test all 5 hubs (Command Center, Roster HQ, Competition Center, Market District, Settings Hub)
   - Verify deep linking and back navigation
   - Check breadcrumb navigation

2. **Critical User Flows**
   - Team management workflows
   - Match viewing experience
   - Credit transactions (verify "amount₡" format)
   - Player selection and roster changes

3. **Accessibility Audit**
   - Keyboard navigation (tab through interface)
   - Focus indicators visibility
   - Color contrast validation
   - Screen reader compatibility

### Phase 4: Visual Design Assessment
1. **Design Consistency Check**
   - Compare against design principles
   - Verify brand guideline adherence
   - Check component spacing and alignment
   - Validate typography hierarchy

2. **Realm Rivalry Specific Validation**
   - Verify fantasy sports authenticity
   - Check Dome Ball thematic elements
   - Confirm credit display format compliance
   - Validate race diversity representation

### Phase 5: Performance & Technical Review
1. **Loading Performance**
   - Measure page load times
   - Check for layout shift
   - Verify smooth animations
   - Test transition performance

2. **Error Analysis**
   ```bash
   mcp__playwright__browser_console_messages
   ```
   - Categorize console errors by severity
   - Identify JavaScript errors
   - Check network request failures
   - Validate API response times

### Phase 6: Comprehensive Reporting
1. **Create Design Review Report**
   - Executive summary of findings
   - Issue classification (Blockers, High Priority, Medium Priority, Nitpicks)
   - Evidence screenshots with annotations
   - Specific recommendations for improvements

2. **Todo List Creation**
   ```bash
   TodoWrite
   ```
   - Create actionable items for each issue found
   - Prioritize by user impact
   - Assign estimated effort levels
   - Include validation criteria for fixes

## Expected Output

**Comprehensive Review Report:**
```
# Design Review Report - Realm Rivalry Dashboard

## Executive Summary
Comprehensive review completed across 4 viewports with focus on mobile-first experience and fantasy sports authenticity.

## Tested Environments
✅ Mobile (375x667, 414x896) - iPhone SE & 11
✅ Tablet (768x1024) - iPad Pro
✅ Desktop (1920x1080) - Standard desktop
✅ Accessibility audit completed
✅ Performance metrics captured

## 🚨 Blockers (Must Fix)
[Critical issues that prevent release]

## 🔴 High Priority Issues
[Important problems affecting user experience]

## 🟡 Medium Priority Issues
[Improvements for next iteration]

## 🔵 Nitpicks
[Polish opportunities]

## ✅ Strengths
[What works exceptionally well]

## 📸 Evidence
- mobile-review.png: Mobile viewport issues
- tablet-review.png: Tablet layout validation
- desktop-review.png: Desktop enhancement verification

## 🎯 Next Actions
[Specific, prioritized recommendations]

**Review Status: COMPLETE ✅**
**Overall Quality Score: 8.5/10**
**Ready for Production: YES/NO**
```

## Critical Validation Checklist

**🚨 ALWAYS VERIFY:**
- [ ] Credits display as "25,000₡" format (NEVER "₡25,000")
- [ ] Touch targets ≥ 44px on mobile
- [ ] 5-hub navigation works correctly
- [ ] Console shows no critical errors
- [ ] Mobile viewport (375px) functions properly
- [ ] Keyboard navigation complete
- [ ] Loading states appropriate

## Usage Examples

**Basic Design Review:**
```
/design-review
```

**Focused Review with Context:**
```
/design-review
Focus on the dashboard changes I made yesterday, particularly the credit display formatting and mobile navigation improvements.
```

**Expected Interaction:**
- Automatically tests across all viewports
- Captures evidence screenshots
- Provides prioritized feedback
- Creates actionable todo items
- Maintains Realm Rivalry context throughout