# Design Review Workflow - CLAUDE.md Integration

**Add this section to your CLAUDE.md for comprehensive design review integration**

## 🎨 AUTOMATED DESIGN REVIEW WORKFLOW

### **Design Review Integration Points**

**Quick Visual Check - After Any UI Changes**
Perform immediate validation for all UI modifications:

1. **Identify Changed Components**
   - List specific components/pages modified
   - Map affected user journeys
   - Note any new interactive elements

2. **Live Environment Verification** 
   ```bash
   # Navigate to local development
   mcp__playwright__browser_navigate http://localhost:5173
   
   # Check for console errors
   mcp__playwright__browser_console_messages
   ```

3. **Mobile-First Validation**
   ```bash
   # Test on mobile viewport first (iPhone SE)
   mcp__playwright__browser_resize 375 667
   
   # Navigate through changed areas
   # Verify touch targets ≥ 44px
   # Check credit format displays as "amount₡"
   ```

4. **Design Compliance Check**
   - Reference `/context/design-principles.md`
   - Verify adherence to `/context/style-guide.md`
   - Confirm 5-hub architecture consistency
   - Validate Realm Rivalry brand standards

5. **Capture Evidence**
   ```bash
   # Screenshot key states for documentation
   mcp__playwright__browser_take_screenshot
   ```

### **Comprehensive Design Review Triggers**

Use the **@agent-design-review** subagent when:
- ✅ Completing significant UI/UX features
- ✅ Finalizing PRs with visual changes  
- ✅ Need thorough accessibility validation
- ✅ Implementing new components
- ✅ Before production deployments

### **Design Review Agent Invocation**
```
Hey Claude, run a comprehensive design review using the @agent-design-review subagent. 

Focus on the [specific component/feature] changes I just made, paying special attention to:
- Mobile-first functionality  
- Credit display formatting
- Accessibility compliance
- 5-hub navigation integration

Please test across mobile, tablet, and desktop viewports.
```

### **Critical Validation Checklist**

**🚨 ALWAYS VERIFY:**
- [ ] Credits display as "25,000₡" format (NEVER "₡25,000")
- [ ] Touch targets ≥ 44px on mobile
- [ ] 5-hub navigation works correctly
- [ ] Console shows no critical errors
- [ ] Mobile viewport (375px) functions properly
- [ ] Keyboard navigation works throughout
- [ ] Loading states display appropriately

**📱 Mobile-First Checks:**
- [ ] Interface works on iPhone SE (375x667)
- [ ] Thumb-zone optimization for primary actions  
- [ ] Smooth scrolling and gesture response
- [ ] Safe area handling for notched devices

**♿ Accessibility Requirements:**
- [ ] Keyboard navigation complete
- [ ] Focus indicators visible
- [ ] Alt text for all images
- [ ] 4.5:1 contrast ratio minimum

**🎮 Realm Rivalry Context:**
- [ ] Fantasy sports authenticity maintained
- [ ] Dome Ball sport mechanics clear
- [ ] Race diversity appropriately represented
- [ ] Seasonal context visible when relevant

### **Post-Review Action Items**

**After Design Review Completion:**
1. Address any 🚨 Blockers immediately
2. Plan 🔴 High Priority fixes for current sprint
3. Schedule 🟡 Medium Priority improvements
4. Document 🔵 Nitpicks for future consideration
5. Update design system documentation if patterns change

### **Design Review Slash Command** 
*(Optional - requires Claude Code slash command setup)*
```
/design-review
```
Automatically triggers comprehensive design review of current branch changes.

### **Integration with Development Workflow**

**Before committing UI changes:**
```bash
# 1. Quick visual check
npm run dev:local
# Navigate and verify changes work

# 2. Request design review  
# "Claude, run design review on my dashboard changes"

# 3. Address any blockers found
# Fix critical issues before commit

# 4. Commit with confidence
git add . && git commit -m "feat: updated dashboard with design review validation"
```

---

**This workflow transforms design quality from reactive to proactive, catching issues early and maintaining professional standards throughout development.**

## 🔧 DESIGN SYSTEM ARCHITECT WORKFLOW

*Enhanced workflow from PR #6 integration*

### **Design Token Generation**
When creating new components or updating design system:

1. **Extract Design Tokens**
   - Analyze existing brand assets
   - Generate consistent color, typography, spacing tokens
   - Create framework-agnostic design tokens

2. **Multi-Framework Support**
   - Generate React components (primary)
   - Export CSS custom properties
   - Create design system documentation

3. **Automated Validation**
   - 98% design consistency through token validation
   - Automated accessibility compliance checking
   - Performance optimization recommendations

### **Design System Architect Agent Usage**
```
Claude, act as the Design System Architect. 

I need to create a new [component type] that follows our design system. Please:
1. Extract appropriate design tokens from our style guide
2. Generate the React component with TypeScript
3. Ensure WCAG AA compliance
4. Optimize for mobile-first usage
5. Include comprehensive documentation

Reference our design principles and style guide for consistency.
```

**This creates a complete design system lifecycle: Design System Architect → Creates Standards → Design Review → Validates Standards**