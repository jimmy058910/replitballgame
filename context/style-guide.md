# Realm Rivalry Style Guide & Brand Standards

**Visual identity and brand standards for Realm Rivalry - Fantasy Sports Dome Ball Game**

## 🎨 BRAND IDENTITY

### **Brand Personality**
- **Competitive**: High-stakes fantasy sports excitement
- **Immersive**: Rich fantasy world with diverse races
- **Accessible**: Welcoming to both casual and hardcore sports fans
- **Dynamic**: Fast-paced, action-oriented experience
- **Strategic**: Depth in team management and tactical decisions

### **Voice & Tone**
- **Enthusiastic but Professional**: Sports broadcaster energy
- **Inclusive**: Welcoming to all skill levels
- **Informative**: Clear explanation of complex game mechanics
- **Exciting**: Conveys the thrill of competition without being overwhelming

## 🎯 COLOR PALETTE

### **Primary Brand Colors**
```css
:root {
  /* Primary Brand */
  --realm-primary: #1a365d;          /* Deep blue - authority, trust */
  --realm-primary-hover: #2c5282;    /* Lighter blue for interactions */
  --realm-primary-light: #bee3f8;    /* Light blue for backgrounds */
  
  /* Secondary Accent */
  --realm-secondary: #d69e2e;        /* Gold - victory, achievement */
  --realm-secondary-hover: #b7791f;  /* Darker gold for interactions */
  --realm-secondary-light: #faf089;  /* Light gold for highlights */
}
```

### **Semantic Colors**
```css
:root {
  /* Success */
  --success: #48bb78;                /* Win conditions, positive actions */
  --success-light: #c6f6d5;         /* Success backgrounds */
  --success-dark: #2f855a;          /* Success text on light */
  
  /* Warning */
  --warning: #ed8936;                /* Cautions, pending states */
  --warning-light: #fed7aa;         /* Warning backgrounds */
  --warning-dark: #c05621;          /* Warning text */
  
  /* Error */
  --error: #e53e3e;                  /* Errors, losses, critical issues */
  --error-light: #fed7d7;           /* Error backgrounds */
  --error-dark: #c53030;            /* Error text */
  
  /* Info */
  --info: #4299e1;                  /* Information, help, neutral states */
  --info-light: #bee3f8;            /* Info backgrounds */
  --info-dark: #2b6cb0;             /* Info text */
}
```

### **Fantasy Race Color Associations**
```css
:root {
  /* Race-Specific Theming (subtle, not overwhelming) */
  --race-earth: #8b5a2b;            /* Earthy, grounded */
  --race-air: #87ceeb;              /* Light, ethereal */
  --race-fire: #ff6b47;             /* Intense, energetic */
  --race-water: #4682b4;            /* Flowing, adaptive */
  --race-shadow: #6b46c1;           /* Mysterious, strategic */
}
```

### **Neutral Grays**
```css
:root {
  /* Gray Scale */
  --gray-50: #f7fafc;
  --gray-100: #edf2f7;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e0;
  --gray-400: #a0aec0;
  --gray-500: #718096;              /* Body text */
  --gray-600: #4a5568;              /* Headings */
  --gray-700: #2d3748;              /* Dark text */
  --gray-800: #1a202c;              /* Very dark text */
  --gray-900: #171923;              /* Maximum contrast */
}
```

## ✍️ TYPOGRAPHY

### **Font Stack**
```css
:root {
  /* Primary Font - UI/Interface */
  --font-primary: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", 
                  Roboto, "Helvetica Neue", Arial, sans-serif;
  
  /* Display Font - Headers/Branding */
  --font-display: "Montserrat", "Inter", -apple-system, BlinkMacSystemFont, 
                  "Segoe UI", Roboto, sans-serif;
  
  /* Monospace - Statistics/Technical */
  --font-mono: "JetBrains Mono", "Fira Code", "Roboto Mono", 
               "SF Mono", Monaco, "Cascadia Code", monospace;
}
```

### **Type Scale**
```css
:root {
  /* Display Text */
  --text-6xl: 3.75rem;    /* 60px - Hero titles */
  --text-5xl: 3rem;       /* 48px - Page titles */
  --text-4xl: 2.25rem;    /* 36px - Section headers */
  
  /* Headings */
  --text-3xl: 1.875rem;   /* 30px - Major headings */
  --text-2xl: 1.5rem;     /* 24px - Subheadings */
  --text-xl: 1.25rem;     /* 20px - Component titles */
  --text-lg: 1.125rem;    /* 18px - Large body text */
  
  /* Body Text */
  --text-base: 1rem;      /* 16px - Primary reading */
  --text-sm: 0.875rem;    /* 14px - Secondary text */
  --text-xs: 0.75rem;     /* 12px - Captions, metadata */
}
```

### **Line Heights**
```css
:root {
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;     /* Default for body text */
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}
```

### **Font Weights**
```css
:root {
  --font-thin: 100;
  --font-light: 300;
  --font-normal: 400;        /* Default body text */
  --font-medium: 500;        /* Emphasized text */
  --font-semibold: 600;      /* Headings */
  --font-bold: 700;          /* Strong emphasis */
  --font-extrabold: 800;     /* Display text */
  --font-black: 900;         /* Maximum impact */
}
```

## 📏 SPACING & LAYOUT

### **Spacing Scale (Tailwind-based)**
```css
:root {
  /* Base unit: 4px */
  --space-0: 0;
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px - Base unit */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
}
```

### **Component Spacing Standards**
- **Touch Targets**: Minimum 44px (space-11) for all interactive elements
- **Card Padding**: 16px (space-4) for compact cards, 24px (space-6) for detailed cards
- **Section Margins**: 32px (space-8) between major sections
- **Hub Navigation**: 8px (space-2) between navigation items

## 🖼️ VISUAL ELEMENTS

### **Border Radius**
```css
:root {
  --radius-none: 0;
  --radius-sm: 0.125rem;     /* 2px */
  --radius-default: 0.25rem; /* 4px - Standard buttons, cards */
  --radius-md: 0.375rem;     /* 6px */
  --radius-lg: 0.5rem;       /* 8px - Major components */
  --radius-xl: 0.75rem;      /* 12px */
  --radius-2xl: 1rem;        /* 16px */
  --radius-full: 9999px;     /* Circular elements */
}
```

### **Shadows**
```css
:root {
  /* Elevation shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-default: 0 1px 3px rgba(0, 0, 0, 0.1), 
                    0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 
               0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 
               0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 
               0 10px 10px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
}
```

### **Borders**
```css
:root {
  --border-width-0: 0;
  --border-width-default: 1px;
  --border-width-2: 2px;
  --border-width-4: 4px;
  --border-width-8: 8px;
  
  /* Border colors */
  --border-default: var(--gray-200);
  --border-focus: var(--realm-primary);
  --border-error: var(--error);
  --border-success: var(--success);
}
```

## 💰 CREDIT FORMATTING STANDARDS

### **CRITICAL: Credit Display Format**
**ALWAYS**: `amount₡` format - amount BEFORE the ₡ symbol

```typescript
// ✅ CORRECT implementations
"25,000₡"
"1.5M₡" 
"750K₡"
"0₡"

// ❌ NEVER use these formats
"₡25,000"
"₡1.5M"
"Credits: 25000"
```

### **Credit Utility Usage**
```typescript
import { creditFormatter } from '@/utils/creditFormatter';

// Always use the utility
const displayCredits = creditFormatter(userCredits);
// Results in "25,000₡" format
```

### **Credit Color Coding**
```css
:root {
  --credit-positive: var(--success);      /* Green for gains */
  --credit-negative: var(--error);        /* Red for losses */
  --credit-neutral: var(--gray-600);      /* Gray for balances */
  --credit-warning: var(--warning);       /* Orange for low balances */
}
```

## 🏈 DOME BALL VISUAL IDENTITY

### **Sport-Specific Colors**
```css
:root {
  /* Game State Colors */
  --game-active: #10b981;      /* Live matches */
  --game-pending: #f59e0b;     /* Scheduled matches */
  --game-completed: #6b7280;   /* Finished matches */
  --game-cancelled: #ef4444;   /* Cancelled matches */
  
  /* Performance Colors */
  --performance-excellent: #059669;
  --performance-good: #10b981;
  --performance-average: #f59e0b;
  --performance-poor: #ef4444;
}
```

### **Team & League Visual Hierarchy**
- **Team Names**: font-semibold, realm-primary color
- **League Names**: font-medium, gray-700
- **Subdivision Indicators**: Subtle background colors (alpha, beta, gamma)
- **Season Context**: Always visible but subtle

## 📱 MOBILE-SPECIFIC STANDARDS

### **Touch Target Sizes**
```css
:root {
  --touch-target-min: 44px;    /* Minimum for all interactive elements */
  --touch-target-comfortable: 48px;  /* Preferred size */
  --touch-spacing: 8px;        /* Minimum space between touch targets */
}
```

### **Mobile Typography Scaling**
```css
/* Mobile-specific font size adjustments */
@media (max-width: 640px) {
  :root {
    --text-6xl: 2.5rem;    /* Scaled down for mobile */
    --text-5xl: 2rem;      /* Scaled down */
    --text-4xl: 1.75rem;   /* Scaled down */
  }
}
```

### **Safe Area Considerations**
```css
:root {
  /* iOS Safe Area Variables */
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-right: env(safe-area-inset-right);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
}
```

## 🎛️ COMPONENT DESIGN TOKENS

### **Button Styles**
```css
.btn-primary {
  background: var(--realm-primary);
  color: white;
  border-radius: var(--radius-default);
  padding: var(--space-3) var(--space-6);
  font-weight: var(--font-medium);
  min-height: var(--touch-target-min);
}

.btn-secondary {
  background: var(--realm-secondary);
  color: var(--gray-900);
  /* ... rest of styling */
}
```

### **Card Styles**
```css
.card-default {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-default);
  padding: var(--space-6);
  border: 1px solid var(--border-default);
}

.card-elevated {
  box-shadow: var(--shadow-lg);
  /* Enhanced shadow for important cards */
}
```

### **Input Styles**
```css
.input-default {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  min-height: var(--touch-target-min);
}

.input-default:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
  outline: none;
}
```

## 🔄 ANIMATION & TRANSITIONS

### **Standard Transitions**
```css
:root {
  /* Timing Functions */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Duration */
  --duration-75: 75ms;
  --duration-100: 100ms;
  --duration-150: 150ms;       /* Standard UI transitions */
  --duration-200: 200ms;
  --duration-300: 300ms;       /* Page transitions */
  --duration-500: 500ms;
  --duration-700: 700ms;
  --duration-1000: 1000ms;
}
```

### **Common Animation Patterns**
- **Hover States**: 150ms ease-out
- **Focus States**: 100ms ease-out
- **Page Transitions**: 300ms ease-in-out
- **Loading Animations**: 1000ms linear repeat
- **Success Feedback**: 200ms ease-out with scale

## 📐 RESPONSIVE BREAKPOINTS

```css
:root {
  /* Breakpoint values */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Usage in media queries */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
```

## 🎯 IMPLEMENTATION GUIDELINES

### **CSS Custom Property Usage**
Always use CSS custom properties for consistency:
```css
/* ✅ CORRECT */
.my-component {
  color: var(--realm-primary);
  padding: var(--space-4);
  border-radius: var(--radius-default);
}

/* ❌ AVOID hardcoded values */
.my-component {
  color: #1a365d;
  padding: 16px;
  border-radius: 4px;
}
```

### **Component Naming Convention**
- **BEM Methodology**: `.block__element--modifier`
- **Realm Prefix**: `.rr-` for custom components
- **State Classes**: `.is-active`, `.is-loading`, `.is-disabled`

### **Accessibility Requirements**
- **Color Contrast**: Minimum 4.5:1 ratio for normal text
- **Focus Indicators**: Clear visual focus for keyboard navigation
- **Touch Targets**: 44px minimum for all interactive elements
- **Alt Text**: Descriptive alt text for all images

---

**This style guide ensures consistent, accessible, and beautiful interfaces across all Realm Rivalry experiences. All components should follow these standards for cohesive user experience.**

*Last Updated: September 2025*
*Review Schedule: Monthly updates as the design system evolves*