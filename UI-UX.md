# Realm Rivalry - UI/UX Design System
## Player Cards & Interface Components

*Last Updated: September 11th, 2025*  
*Status: Master UI/UX Specifications*  
*Source: Google Doc Consolidation & Live Implementation Analysis*

---

## 📋 Cross-Reference Analysis Results

### ✅ Specifications Validated Against Current Documentation
- **REALM_RIVALRY_COMPLETE_DOCUMENTATION.md**: Limited player card detail found - requires expansion
- **Live Implementation**: Roster HQ currently has React hook errors, main dashboard functional
- **Mobile-First Architecture**: ✅ Confirmed operational in live environment
- **5-Hub Navigation**: ✅ Successfully implemented and functional
- **Credit Format Standard**: ✅ Confirmed "25,000₡" format implemented correctly

---

## 🎯 Player Detail Sheet - Complete Specification

### **Core Design Philosophy**
**All-Functions-in-One-Sheet Approach**: Comprehensive player management interface with contextual progressive disclosure and mobile-first optimization.

### **Above the Fold - Immediate Information**
*Critical information visible without scrolling (mobile: <667px viewport)*

#### **Primary Header Section**
```typescript
interface PlayerHeaderDesign {
  layout: 'flex-row mobile:flex-col';
  elements: {
    avatar: {
      size: '80px desktop, 64px mobile';
      fallback: 'Race-based default avatar';
      interaction: 'Click to change (if owned)';
    };
    identity: {
      name: 'FirstName LastName';
      role: 'Passer | Runner | Blocker';
      race: 'Visual indicator + text';
      team: 'Team name + jersey number';
    };
    statusIndicators: {
      powerScore: 'Large prominent number';
      recentStat: '"Last match: 2 scores, 170 carrier yards"';
      contract: 'Format: "25,000₡/yr × 3yrs"';  // CRITICAL: Amount before ₡
      chemistry: 'Percentage with color coding';
      stamina: 'Donut gauge (yellow if <90%)';
      health: 'Badge: green=Healthy, red=Injured';
    };
  };
}
```

#### **Visual Hierarchy Implementation**
1. **Name** - H1, largest text, team colors
2. **Role + Race** - H2, secondary prominence  
3. **Power Score** - Large numeric display, color-coded by tier
4. **Quick Stats** - Recent performance summary
5. **Status Badges** - Health, contract, chemistry visual indicators

### **Potential Rating System (5-Star)**

#### **Display Requirements**
```typescript
interface PotentialStarSystem {
  baseline: '5 gray star outlines always visible';
  fillMethod: 'Color-fill up to actual rating (e.g., 3.5/5)';
  starColors: {
    '5.0': 'gold (#FFD700)';
    '4.5-4.9': 'purple (#9333EA)';
    '3.5-4.4': 'blue (#3B82F6)';  
    '2.5-3.4': 'green (#22C55E)';
    '<2.5': 'gray (#6B7280)';
  };
  tooltip: '"Scouted potential. Stars refined as player is developed or scouted."';
  animation: 'Subtle glow on high-potential players (4+ stars)';
}
```

#### **Interaction Behavior**
- **Hover/Tap**: Shows detailed breakdown of potential categories
- **Long Press (Mobile)**: Quick comparison with team average
- **Color Psychology**: Gold = Elite, Purple = High, Blue = Good, Green = Decent, Gray = Developing

### **Action Button Row - Always Visible**

#### **Primary Actions**
```typescript
interface ActionButtonDesign {
  layout: 'Fixed position, always visible on scroll';
  buttons: [
    {
      label: 'Negotiate';
      icon: '💼';
      action: 'Contract renegotiation modal';
      disabled: 'Gray out if contract locked';
      tooltip: '"Renegotiate contract (will update salary)..."';
    },
    {
      label: 'Heal';
      icon: '🏥'; 
      action: 'Medical treatment options';
      disabled: 'If not injured';
      tooltip: 'Show available healing items/treatments';
    },
    {
      label: 'Equip';
      icon: '⚔️';
      action: 'Equipment management modal';
      badge: 'Show count of available equipment';
    },
    {
      label: 'Release';
      icon: '📤';
      action: 'Release player confirmation';
      disabled: 'Gray out on contract lock';
      style: 'Secondary/danger styling';
    }
  ];
  mobile: {
    touchTarget: '≥44px minimum';
    spacing: '8px between buttons';
    iconSize: '20px';
  };
}
```

### **Progressive Disclosure - Accordion Sections**

#### **Section Order & Content**
```typescript
interface AccordionSections {
  1: {
    title: 'Game Performance (Last 1-5 Matches)';
    content: {
      matchCards: 'Compact cards showing opponent, stats, result';
      trendIndicators: 'Up/down arrows for performance trends';
      keyMoments: 'Highlight exceptional plays or failures';
    };
  };
  
  2: {
    title: 'All Attributes';
    content: {
      display: 'Horizontal bar graphs';
      colorCoding: '>30 stats get purple border glow';
      categories: ['Physical', 'Mental', 'Technical', 'Leadership'];
      comparison: 'Subtle team/position average comparison';
    };
  };
  
  3: {
    title: 'Abilities & Skills';
    content: {
      activeSkills: 'Highlighted with current level';
      maxedSkills: 'Level 3 skills darkened with "Maximum Reached!" message';
      learningOpportunities: 'If 0 level, show "How to earn/learn" guidance';
      progressBars: 'Visual progress toward next level';
    };
  };
  
  4: {
    title: 'Equipment';
    content: {
      slotGrid: '3x2 equipment slot visualization';
      emptySlots: 'Gray placeholder indicating slot type';
      equippedItems: 'Bright highlight for Legendary/race-specific items';
      itemDetails: '"View Item" button for detailed stats';
      recommendations: 'Suggest optimal equipment based on role';
    };
  };
  
  5: {
    title: 'Medical & Recovery';
    content: {
      healthyState: 'Gray static display when uninjured';
      injuryTimeline: 'Visual timeline when injured';
      treatmentPlan: 'Available recovery items and estimated healing time';
      preventionTips: 'Suggest training to reduce injury risk';
    };
  };
}
```

### **Enhanced Features & Polish**

#### **Contextual Intelligence**
```typescript
interface SmartFeatures {
  chemistry: {
    warningThreshold: 40;
    indicator: 'Mini warning icon with tooltip';
    message: '"Low morale - performance penalty applies"';
  };
  
  leadership: {
    trigger: 'Leadership stat in top 2 on team';
    badge: '"Leader" badge with special styling';
    effect: 'Tooltip explaining leadership benefits';
  };
  
  attributes: {
    elite: '>30 stat value';
    effects: ['glow', 'bounce animation', 'color pulse'];
    purpose: 'Highlight top-tier capabilities';
  };
  
  stamina: {
    healthyRange: '90-100%';
    warningRange: '<90% shows yellow donut gauge';
    tooltip: 'Shows estimated recovery time';
  };
}
```

#### **Comparison & Management Tools**
```typescript
interface ManagementTools {
  compare: {
    trigger: 'Compare button click';
    modal: 'Dynamically sized modal/slideover';
    content: 'Side-by-side stat comparison with selected players';
    maxPlayers: 3;
  };
  
  favorite: {
    label: 'Pin to Roster → Favorite';
    icon: '❤️ heart/star icon';
    function: 'Add to top of Roster HQ for quick access';
    feedback: 'Visual confirmation animation';
  };
  
  scouting: {
    reports: 'Access to scout reports and recommendations';
    potential: 'Historical potential changes tracking';
    notes: 'Coach notes and development plans';
  };
}
```

### **Mobile-First Responsive Design**

#### **Critical Mobile Requirements**
```typescript
interface MobileOptimization {
  touchTargets: {
    minimum: '44px × 44px';
    optimal: '48px × 48px';
    spacing: '8px minimum between interactive elements';
  };
  
  gestures: {
    longPress: 'Quick actions menu (Heal, Equip, Release, Compare)';
    swipe: 'Navigate between players in same context';
    pull: 'Refresh player data';
  };
  
  viewport: {
    critical: '375px × 667px (iPhone SE)';
    sections: 'Sticky section titles during scroll';
    loading: 'Skeleton UI for slow data loads, never blank modal';
  };
  
  accessibility: {
    focusIndicators: 'Visible focus rings for keyboard navigation';
    screenReader: 'Comprehensive ARIA labels and descriptions';
    colorBlind: 'Pattern/shape indicators in addition to colors';
    contrast: '4.5:1 minimum ratio for all text';
  };
}
```

#### **Performance Considerations**
- **Loading States**: Skeleton UI during data fetch, never empty modals
- **Image Loading**: Progressive loading for avatars and equipment icons  
- **Animation**: Reduced motion respect for accessibility
- **Data**: Lazy loading of historical performance data

### **Integration Points**

#### **Backend Requirements**
```typescript
interface BackendIntegration {
  endpoints: {
    playerDetail: '/api/players/:playerId';
    negotiations: '/api/players/:playerId/negotiate';
    medical: '/api/players/:playerId/heal';
    equipment: '/api/players/:playerId/equip';
    release: '/api/players/:playerId/release';
  };
  
  realTimeUpdates: {
    webSocket: 'Live stat updates during matches';
    notifications: 'Injury alerts, contract expiry warnings';
    chemistry: 'Real-time team chemistry calculations';
  };
  
  dataValidation: {
    statRanges: 'Validate stat values within expected ranges';
    equipmentCompatibility: 'Race/role equipment restrictions';
    contractRules: 'Salary cap and contract length limits';
  };
}
```

#### **State Management**
```typescript
interface StateArchitecture {
  cache: {
    strategy: 'TanStack React Query with 5-minute staleTime';
    invalidation: 'Hierarchical cache invalidation on updates';
    optimistic: 'Optimistic updates for immediate user feedback';
  };
  
  modals: {
    stack: 'Support for modal stacking (equipment → item details)';
    persistence: 'Remember modal state during navigation';
    cleanup: 'Proper cleanup on component unmount';
  };
}
```

---

## 🎨 Design Token Integration

### **Color System**
```css
:root {
  /* Player Card Specific Tokens */
  --player-card-bg: var(--surface-elevated);
  --player-card-border: var(--border-subtle);
  --player-card-shadow: var(--shadow-lg);
  
  /* Potential Star Colors */
  --potential-gold: #FFD700;
  --potential-purple: #9333EA;
  --potential-blue: #3B82F6;
  --potential-green: #22C55E;
  --potential-gray: #6B7280;
  
  /* Status Colors */
  --health-good: var(--success-600);
  --health-injured: var(--error-600);
  --chemistry-low: var(--warning-600);
  --stamina-low: var(--warning-500);
  
  /* Action Button Colors */
  --action-primary: var(--primary-600);
  --action-secondary: var(--neutral-600);
  --action-danger: var(--error-600);
  --action-disabled: var(--neutral-300);
}
```

### **Typography Scale**
```css
.player-card {
  /* Player Name */
  --name-size: var(--text-2xl);
  --name-weight: var(--font-bold);
  --name-line-height: var(--leading-tight);
  
  /* Role & Stats */
  --role-size: var(--text-lg);
  --stat-size: var(--text-base);
  --stat-small: var(--text-sm);
  
  /* Power Score */
  --power-size: var(--text-4xl);
  --power-weight: var(--font-black);
}
```

---

## 📱 Component Architecture

### **Component Hierarchy**
```
PlayerDetailCard/
├── PlayerHeader/
│   ├── PlayerAvatar/
│   ├── PlayerIdentity/
│   └── StatusIndicators/
├── PotentialStars/
├── ActionButtonRow/
├── PlayerAccordion/
│   ├── GamePerformanceSection/
│   ├── AttributesSection/
│   ├── SkillsSection/
│   ├── EquipmentSection/
│   └── MedicalSection/
└── PlayerComparisonModal/
```

### **Reusable Components**
```typescript
// Core reusable components for player cards
export interface PlayerCardComponents {
  StarRating: 'Reusable 5-star display with color coding';
  StatBar: 'Horizontal bar chart with team average comparison';
  ActionButton: 'Consistent button styling with icons and tooltips';
  HealthBadge: 'Status badge with color and icon indicators';
  EquipmentSlot: 'Equipment slot visualization with drag-drop';
  PerformanceCard: 'Match performance summary card';
}
```

---

## ✅ Implementation Checklist

### **Phase 1: Foundation**
- [ ] Create core PlayerDetailCard component structure
- [ ] Implement 5-star potential rating system with color coding
- [ ] Build responsive header with all status indicators
- [ ] Add mobile-first action button row with proper touch targets

### **Phase 2: Progressive Disclosure**  
- [ ] Implement accordion sections with smooth animations
- [ ] Build attribute visualization with >30 stat highlighting
- [ ] Create equipment slot grid with item management
- [ ] Add medical tracking with injury timeline

### **Phase 3: Enhanced Features**
- [ ] Implement player comparison modal
- [ ] Add chemistry warnings and leadership badges
- [ ] Build favorite/pinning functionality  
- [ ] Integrate real-time WebSocket updates

### **Phase 4: Polish & Optimization**
- [ ] Add loading skeletons and error states
- [ ] Implement accessibility features (ARIA, focus management)
- [ ] Optimize for reduced motion preferences
- [ ] Performance testing and optimization

### **Phase 5: Integration**
- [ ] Connect to all required backend endpoints
- [ ] Implement state management with React Query
- [ ] Add comprehensive error handling
- [ ] Final testing across all device sizes

---

## 🔍 Consolidation Recommendations

### **Google Doc Tab Cleanup Strategy**
Based on this comprehensive specification, the following Google Doc tabs can be **safely consolidated and deleted**:

#### **✅ Ready for Deletion (Content Captured)**
1. **Player Detail Sheet** - ✅ Fully documented above
2. **Player Cards UI/UX** - ✅ Comprehensive specification complete
3. **Mobile Player Interface** - ✅ Integrated into mobile-first design
4. **Equipment Management** - ✅ Covered in equipment section above

#### **🔄 Requires Review Before Deletion**
- **Player Statistics Display** - Verify all stat visualization requirements captured
- **Roster Management Flow** - Ensure integration points documented
- **Medical System UI** - Confirm medical section covers all requirements

#### **📋 Master Documentation Status**
- **UI-UX.md**: ✅ Created as master player card specification
- **REALM_RIVALRY_COMPLETE_DOCUMENTATION.md**: Requires update to reference UI-UX.md
- **CLAUDE.md**: Should link to UI-UX.md for player interface guidance

---

## 💰 Market District Hub - Current Implementation Status

*Analysis Date: September 11th, 2025*  
*Status: ✅ FULLY IMPLEMENTED AND OPERATIONAL*  
*Location: `client/src/pages/MarketDistrict.tsx`*

### **🏆 Implementation Exceeds Proposed Documentation**

The current Market District implementation is **significantly more sophisticated** than initially proposed documentation. All core features are operational with professional-grade enhancements.

#### **✅ 4-Tab Structure (Fully Implemented)**

**1. Store Tab - Enhanced Progressive Disclosure**
```typescript
interface StoreTabFeatures {
  dailyEntries: {
    exhibitionEntry: 'Daily limit: 3, ₡500 each, purchase tracking';
    tournamentEntry: 'Daily limit: 1, ₡2,000 each, token system';
    integration: 'Real API endpoints with React Query mutations';
  };
  
  rotatingItems: {
    display: '8-item grid with category chips (Boost, Equipment, etc.)';
    itemDetails: 'Enhanced info cards with stat effects, race restrictions';
    purchaseLimits: 'Visual purchase tracking with daily limits';
    pricing: 'Dual currency support (credits/gems) with proper formatting';
  };
  
  gemPackages: {
    packages: '6 tiered packages (Pouch → Vault) with bonus gems';
    colorCoding: 'Professional gradient styling per package tier';
    integration: 'Stripe payment integration ready (placeholder UI)';
    pricing: 'Real USD pricing with gem bonus calculations';
  };
  
  realmPass: {
    subscription: 'Monthly ₡9.99 with 350 gem allowance';
    benefits: 'Ad-free, daily rewards, future cosmetics';
    styling: 'Premium yellow/gold gradient styling';
  };
  
  gemExchange: {
    tiers: 'Multi-tier exchange (1:200 to 1:275 ratios)';
    realTime: 'Live gem balance checking and updates';
    rates: 'Backend-integrated exchange rate calculation';
  };
}
```

**2. Marketplace Tab - Advanced Player Trading**
```typescript
interface MarketplaceFeatures {
  component: 'EnhancedMarketplace with full auction system';
  features: [
    'Player listings with bid/buy-now options',
    'Advanced filtering (age, salary, position, race, power)',
    'Real-time bid tracking with countdown timers',
    'Anti-sniping 15-minute bid extensions',
    'Credit escrow system for secure bidding'
  ];
  integration: 'Complete backend API integration operational';
}
```

**3. Inventory Tab - Comprehensive Item Management**
```typescript
interface InventoryFeatures {
  component: 'EnhancedInventoryTab with smart organization';
  filtering: 'Category chips (Equipment, Consumables, Boosts, Entries, Trophies)';
  boostSlots: 'Visual boost assignment for next league game (0/3 slots)';
  itemCards: '96×96 icons with rarity borders and quantity tracking';
  interaction: 'Drag-and-drop boost assignment with aggregated stat preview';
}
```

**4. Finances Tab - Multi-Modal Financial Management**
```typescript
interface FinancesFeatures {
  component: 'EnhancedFinancesTab with sub-tab architecture';
  subTabs: {
    overview: 'Net income KPIs, revenue/expense breakdown, budget health';
    contracts: 'Active roster contracts (excludes taxi squad), negotiation links';
    transactionLog: 'Consolidated credits/gems transaction history with filters';
    stadium: 'Complete stadium management with upgrade ROI calculations';
  };
  integration: 'Real-time financial data with comprehensive error handling';
}
```

### **🎨 Superior Design Implementation**

#### **Professional Visual Enhancements**
```typescript
interface DesignExcellence {
  hero: {
    banner: 'Dramatic gradient hero with emerald→cyan→blue progression';
    financial: 'Live credit/gem/stadium revenue display in header';
    responsive: 'Mobile-first with backdrop-blur glass effects';
  };
  
  progressive: {
    disclosure: 'Collapsible sections with smooth animations';
    loading: 'Professional skeleton states, never blank screens';
    interactions: 'Hover effects, touch feedback, visual confirmation';
  };
  
  mobile: {
    touchTargets: '≥44px minimum with proper spacing';
    tabNavigation: 'Icon + text tabs with responsive grid layout';
    gestures: 'Native mobile behavior with scroll optimization';
  };
  
  accessibility: {
    contrast: '4.5:1+ ratio compliance throughout';
    keyboard: 'Full keyboard navigation support';
    screenReader: 'Comprehensive ARIA labeling';
  };
}
```

### **⚡ Real-Time Integration Excellence**

#### **Backend Connection Architecture**
```typescript
interface APIIntegration {
  queries: {
    storeItems: '/api/store/items with retry logic and error handling';
    gemPackages: '/api/store/gem-packages with data transformation';
    teamFinances: '/api/teams/my with real-time balance updates';
    transactions: '/api/teams/transactions with pagination support';
  };
  
  mutations: {
    purchases: 'Dual currency purchase system with optimistic updates';
    gemExchange: 'Multi-tier exchange with rate calculation';
    exhibitions: 'Exhibition token purchase with limit tracking';
    marketplace: 'Complete bid/purchase flow with escrow management';
  };
  
  stateManagement: {
    caching: 'TanStack React Query with hierarchical invalidation';
    optimization: 'Selective query invalidation for performance';
    errorHandling: 'Comprehensive error boundaries with user feedback';
  };
}
```

### **📱 Mobile-First Architecture Superiority**

#### **Responsive Design Excellence**
- **Viewport Optimization**: Tested and optimized for iPhone SE (375px) and up
- **Touch Interface**: All interactive elements exceed 44px touch target minimum
- **Progressive Enhancement**: Desktop features gracefully enhance mobile foundation
- **Performance**: Lazy loading, skeleton UI, optimized bundle splitting

### **🎯 Implementation vs Documentation Gap Analysis**

#### **✅ Current Implementation EXCEEDS Proposals**
| Feature Category | Proposed | Implemented | Status |
|------------------|----------|-------------|--------|
| Tab Structure | 4 basic tabs | 4 tabs with progressive disclosure | ✅ EXCEEDED |
| Store Items | Simple grid | Enhanced cards with details | ✅ EXCEEDED |
| Daily Entries | Basic purchase | API integration + tracking | ✅ EXCEEDED |
| Gem Packages | Static display | Dynamic pricing + Stripe ready | ✅ EXCEEDED |
| Exchange System | Simple rates | Multi-tier with backend calculation | ✅ EXCEEDED |
| Marketplace | Basic listing | Full auction system + anti-sniping | ✅ EXCEEDED |
| Inventory | Item grid | Smart filtering + boost assignment | ✅ EXCEEDED |
| Finances | Overview only | Multi-tab with stadium management | ✅ EXCEEDED |
| Mobile Design | Responsive | Mobile-first with touch optimization | ✅ EXCEEDED |

### **🗂️ Documentation Update Recommendations**

#### **✅ Safe to Delete Google Doc Tabs**
The following Market District documentation can be safely archived:
1. **Market Hub Tab Structure** - ✅ Exceeded in implementation
2. **Store Tab Enhancements** - ✅ All features implemented + more
3. **Marketplace Integration** - ✅ Full auction system operational  
4. **Inventory Management** - ✅ Enhanced filtering and boost system
5. **Finances Tab Design** - ✅ Multi-tab architecture implemented

#### **📝 Focus Areas for Future Enhancement**
Rather than rebuilding existing functionality, prioritize:
1. **Additional Store Items** - Expand daily rotation variety
2. **Tournament Entry System** - Complete integration with tournament brackets
3. **Stadium Revenue Optimization** - Enhanced ROI calculations and projections
4. **Marketplace Analytics** - Market trends and pricing insights
5. **Mobile App Integration** - Progressive Web App (PWA) enhancements

---

## 🚀 Next Steps

1. **✅ Delete Consolidated Google Doc Tabs** - Market District documentation is outdated
2. **📱 Continue Google Doc Consolidation** - Move to next tabs for analysis
3. **🔄 Update Cross-References** - Link Market District implementation in main documentation
4. **⚡ Performance Optimization** - Focus on existing feature enhancement vs rebuilding
5. **🎯 Feature Expansion** - Build on solid foundation with new capabilities

---

## 💼 Contract Negotiation Modal - Complete Redesign Specification

*Analysis Date: September 11th, 2025*  
*Status: 🚨 CRITICAL FIXES REQUIRED*  
*Current Issues: ₡0 salary display, missing season timing, poor mobile UX*

### **🔧 Critical Backend Fixes Required**

#### **1. Season Timing Integration**
```typescript
// CURRENT PROBLEM: server/routes/playerRoutes.ts
const currentSeason = 0; // ❌ Hardcoded value

// REQUIRED FIX:
const { timingService } = await import("../../shared/services/timingService.js");
const currentTiming = timingService.getSeasonTiming();
const currentSeason = currentTiming.currentSeason; // ✅ Dynamic value
```

#### **2. Contract Calculation Bug Fix**
```typescript
// Verify ContractService.calculateContractValue() returns:
interface ContractCalculation {
  baseSalary: number;        // ❌ Currently returning 0
  marketValue: number;       // ❌ Currently returning 0  
  minimumOffer: number;      // ❌ Currently returning 0
  signingBonus: number;      // Should be 20% of market value
  salaryRange: {
    min: number;             // 70% of market value
    max: number;             // 150% of market value
  };
}
```

### **🎨 Frontend Redesign Requirements**

#### **A. Enhanced Header Section**
```typescript
interface PlayerHeader {
  layout: 'mobile-first with prominent player info';
  content: {
    playerPortrait: '80px circular avatar with race emoji fallback';
    playerName: 'Large, bold text with team colors';
    roleAndRace: 'PASSER • LUMINA badges';
    ageAndNumber: 'Age 20 • #23 secondary info';
    starRating: '5-star potential display with color coding';
    powerRating: 'Overall power score prominently displayed';
  };
  styling: 'Gradient background matching player race theme';
}
```

#### **B. Current Contract Status (Fixed)**
```typescript
interface ContractStatus {
  currentContract: {
    display: '₡16,500/yr × 2 years remaining';
    endDate: 'Contract ends after Season X';
    timing: 'Today is Season Y, Day Z';
    clarity: 'Renegotiations will take effect at start of Season X+1';
  };
  
  statusIndicator: {
    color: 'green/yellow/red based on contract situation';
    message: 'Clear explanation of when new contract activates';
  };
}
```

#### **C. Interactive Contract Offer Section**
```typescript
interface ContractOfferUI {
  salarySlider: {
    size: 'Large, mobile-friendly slider (≥44px height)';
    display: 'Current value prominently shown above slider';
    range: 'Min/max values clearly labeled';
    feedback: 'Real-time color changes (green=good, red=low)';
    format: 'All amounts as "25,000₡" with proper formatting';
  };
  
  contractLength: {
    control: 'Large +/- stepper buttons (≥44px)';
    display: 'Current value prominently shown';
    range: '1-3 years with clear limits';
  };
  
  signingBonus: {
    display: 'Read-only, pre-calculated from backend';
    format: '"₡5,000 will be paid immediately if accepted"';
    styling: 'Highlighted card with clear explanation';
  };
}
```

#### **D. Live Acceptance Feedback**
```typescript
interface AcceptanceFeedback {
  probabilityBar: {
    display: 'Large colored progress bar (0-100%)';
    colors: 'Green 80%+, Yellow 60-79%, Orange 40-59%, Red <40%';
    text: 'Estimated: 67% Accept' prominently displayed';
  };
  
  playerMessage: {
    content: 'Backend-generated player response';
    examples: [
      '"Seems close. Boost bonus or salary?"',
      '"This offer is insulting. I need much more."',
      '"I\'d be happy to sign this deal!"'
    ];
    styling: 'Speech bubble or highlighted card format';
  };
  
  realTimeUpdates: 'Updates as user adjusts salary/years';
}
```

#### **E. Contract Timeline Clarity**
```typescript
interface ContractTimeline {
  ifAccepted: {
    display: '"If accepted, new contract runs Season X through Season Y"';
    styling: 'Large, colored banner at bottom of offer section';
    emphasis: 'Make timing crystal clear - when it starts/ends';
  };
  
  totalValue: {
    calculation: 'Annual salary × years + signing bonus';
    display: '"Total package: ₡67,500 over 3 seasons"';
    format: 'Prominent summary with breakdown tooltip';
  };
}
```

#### **F. Negotiation History (Optional)**
```typescript
interface NegotiationHistory {
  display: 'Collapsible "Previous Offers" section';
  content: 'Recent offer history with outcomes';
  example: '"₡17,500 × 2 years - Rejected (Day 4): Too low"';
  styling: 'Subtle, non-intrusive historical reference';
}
```

#### **G. Action Buttons & Validation**
```typescript
interface ActionControls {
  submitButton: {
    size: 'Large, full-width primary button (≥44px height)';
    states: {
      valid: '"Submit Offer" - enabled, prominent';
      invalid: 'Disabled with clear error message';
      loading: 'Spinner with "Submitting..." text';
    };
  };
  
  validation: {
    salaryTooLow: '"Must be at least ₡12,500"';
    salaryTooHigh: '"Maximum allowed: ₡45,000"';
    yearsInvalid: '"Contract length: 1-3 years only"';
    display: 'Red text below invalid controls';
  };
  
  cancelButton: 'Secondary styling, less prominent but accessible';
}
```

### **📱 Mobile-First Requirements**

#### **Touch Target Standards**
```typescript
interface MobileOptimization {
  touchTargets: {
    minimum: '44px × 44px for all interactive elements';
    sliders: 'Large thumb/handle, easy drag interaction';
    buttons: 'Full-width with generous padding';
    steppers: 'Large +/- buttons with clear visual feedback';
  };
  
  gestures: {
    slider: 'Smooth drag response, haptic feedback';
    stepper: 'Tap and hold for rapid increment/decrement';
    modal: 'Swipe down or backdrop tap to close';
  };
  
  typography: {
    salaryValues: 'Large, bold text for key numbers';
    labels: 'Clear hierarchy, sufficient contrast';
    feedback: 'Readable at mobile sizes';
  };
}
```

### **🔄 Backend Integration Requirements**

#### **Required API Endpoints**
```typescript
// GET /api/players/:id/contract-negotiation-data
interface ContractNegotiationData {
  calculation: ContractCalculation;    // UVF calculation with ranges
  contractInfo: {
    currentSalary: number;
    currentYears: number;
    currentSeason: number;             // ✅ From TimingService
    contractEndsAfterSeason: number;
    nextContractStartsSeason: number;
  };
  seasonInfo: {
    currentDay: number;                // ✅ From TimingService
    currentPhase: string;              // ✅ From TimingService
  };
}

// POST /api/players/:id/negotiation-feedback  
interface NegotiationFeedback {
  acceptanceProbability: number;       // 0-100%
  playerFeedback: string;              // Human-readable response
  responseType: 'accepting' | 'considering' | 'demanding' | 'rejecting';
}

// POST /api/players/:id/negotiate-contract
interface SubmitOfferResponse {
  accepted: boolean;
  feedback?: string;                   // Reason if rejected
  startSeason?: number;                // When contract begins
  endSeason?: number;                  // When contract ends
  signingBonus?: number;               // Amount paid immediately
}
```

### **🎯 Critical Success Metrics**

#### **Bug Resolution**
- [ ] ₡0 salary displays fixed (show actual calculated values)
- [ ] Season timing shows real values (not "Unknown")
- [ ] All contract calculations work correctly

#### **UX Improvements** 
- [ ] Salary slider shows current value prominently
- [ ] Touch targets ≥44px for all mobile interactions
- [ ] Real-time acceptance probability updates
- [ ] Contract timing is crystal clear

#### **User Flow Validation**
- [ ] Open modal → See player info and current contract
- [ ] Adjust offer → See live feedback and probability
- [ ] Submit offer → Clear success/rejection messaging
- [ ] Contract clarity → User understands when deal activates

### **⚠️ Implementation Priority**

**Phase 1 (Critical Fixes):**
1. Fix backend contract calculation returning ₡0
2. Integrate TimingService for proper season data
3. Ensure API endpoints return valid data

**Phase 2 (UX Enhancement):**
1. Implement mobile-first modal redesign
2. Add real-time acceptance feedback
3. Improve contract timeline clarity

**Phase 3 (Polish):**
1. Add negotiation history
2. Enhanced animations and feedback
3. Comprehensive accessibility testing

---

*This document serves as the definitive specification for UI/UX implementation in Realm Rivalry. Contract negotiation requires immediate attention due to critical backend bugs affecting core functionality.*