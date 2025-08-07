# Unity Ads Implementation Guide - Complete Ad Units

## Overview
Your Unity Ads integration now includes all major ad unit types with optimized placement strategies for maximum revenue and user experience.

## Ad Units Implemented

### 1. **Rewarded Video** ✅
- **Placement ID**: `rewardedVideo`
- **Reward**: 500-10,000 credits
- **Location**: Store page, manual watch
- **Revenue**: $15-50 per 1000 completions
- **User Experience**: Voluntary, high engagement

### 2. **Halftime Video** ✅ NEW
- **Placement ID**: `halftimeVideo`
- **Reward**: 1,000-2,000 credits (bonus)
- **Location**: Mid-game during live matches
- **Revenue**: $20-60 per 1000 completions (premium)
- **User Experience**: Contextual, perfect timing

### 3. **Banner Ads** ✅ NEW
- **Placement ID**: `banner`
- **Revenue**: $0.10-0.50 per 1000 impressions
- **Locations**: 
  - Bottom of live match pages
  - Sidebar on dashboard
  - Top of certain pages
- **User Experience**: Non-intrusive, continuous

### 4. **Interstitial Ads** ✅
- **Placement ID**: `interstitial`
- **Revenue**: $1-3 per 1000 impressions
- **Locations**: 
  - Between game screens
  - After team actions
  - Navigation transitions
- **User Experience**: Full-screen, timed

### 5. **Post-Game Video** ✅ NEW
- **Placement ID**: `postGameVideo`
- **Reward**: 1,500-3,000 credits
- **Location**: After match completion
- **Revenue**: $25-75 per 1000 completions
- **User Experience**: Celebration bonus

## Revenue Optimization Strategy

### **High-Value Placements**
1. **Halftime Video**: Mid-game = high engagement = premium CPM
2. **Post-Game Video**: Victory celebration = user receptive = high completion
3. **Rewarded Video**: User-initiated = highest completion rate

### **Consistent Revenue**
1. **Banner Ads**: Constant impressions during gameplay
2. **Interstitial**: Strategic placement during natural breaks

## Implementation Details

### **Unity Ads Service Enhanced**
```typescript
// Your service now includes:
- showRewardedVideo(placementId)
- showHalftimeVideo() 
- showPostGameVideo()
- showInterstitial()
- Banner ad support
```

### **Smart Timing Logic**
- **Halftime**: Triggered at 50% match completion
- **Post-Game**: Triggered at match end
- **Interstitial**: Between major game actions
- **Banner**: Always visible during gameplay

### **Revenue Tracking**
- Each ad unit tracked separately
- Placement-specific analytics
- Completion rate monitoring
- Revenue attribution per unit

## Expected Revenue Impact

### **With 1,000 Daily Active Users**
- **Rewarded Video**: $200-400/month
- **Halftime Video**: $150-300/month  
- **Post-Game Video**: $100-200/month
- **Banner Ads**: $50-100/month
- **Interstitial**: $100-200/month
- **Total**: $600-1,200/month

### **With 10,000 Daily Active Users**
- **Total**: $6,000-12,000/month

## Best Practices

### **User Experience**
1. **Respect Daily Limits**: 10 ads per day maximum
2. **Contextual Timing**: Ads at natural break points
3. **Skip Options**: Allow skipping after 5 seconds
4. **Clear Rewards**: Show reward amount upfront

### **Revenue Optimization**
1. **A/B Testing**: Test different reward amounts
2. **Seasonal Events**: Bonus rewards during events
3. **Premium Placements**: Higher rewards for prime spots
4. **User Segmentation**: Different rewards for different user types

## Testing Your Implementation

### **Visit These Pages**:
1. **Ad Test Page**: `/ad-test` - Test all ad units
2. **Live Match**: Watch for halftime ads
3. **Store Page**: Test rewarded videos
4. **Dashboard**: See banner ads

### **Monitor Analytics**:
- Unity Ads Dashboard
- Fill rates per placement
- Completion rates
- Revenue per user

## Unity Dashboard Configuration

### **Required Placements**:
1. Create placement: `rewardedVideo`
2. Create placement: `halftimeVideo`
3. Create placement: `postGameVideo`
4. Create placement: `interstitial`
5. Create placement: `banner`

### **Mediation Settings**:
- Enable for all major ad networks
- Set minimum eCPM floors
- Configure geographic targeting
- Enable header bidding for maximum revenue

## Next Steps

### **Week 1**: Monitor Performance
- Track fill rates
- Monitor completion rates
- Analyze revenue per placement
- User feedback on ad experience

### **Week 2**: Optimize
- A/B test reward amounts
- Adjust ad frequency
- Fine-tune placement timing
- Optimize banner positions

### **Week 3**: Scale
- Add more contextual placements
- Implement seasonal campaigns
- Create user engagement programs
- Plan mobile app transition

## Mobile App Benefits

When you transition to React Native:
- **3-5x higher eCPM** on mobile
- **Better fill rates** on mobile devices
- **Native ad formats** for better performance
- **In-app purchase integration** for premium features

Your Unity Ads implementation is now complete and optimized for maximum revenue generation while maintaining excellent user experience!