# Unity Ads Setup Guide

## Quick Start Implementation Status

### ✅ What's Already Done:
- Unity Ads Web SDK loaded in index.html
- UnityAdsService created with full integration
- AdIntegration component updated with Unity Ads support
- Backend routes updated to handle Unity Ads data
- Fallback system implemented for when Unity Ads unavailable
- Test page available at `/ad-test`

### 🔧 What You Need to Do:

#### 1. Create Unity Developer Account
1. Go to https://dashboard.unity3d.com/
2. Sign up for a free Unity account
3. Create a new organization (e.g., "Realm Rivalry")
4. Create a new project (e.g., "Realm Rivalry Web")

#### 2. Get Your Game ID
1. In Unity Dashboard, go to "Monetization"
2. Create a new monetization project
3. Get your Game ID (looks like: `1234567`)
4. Enable "Test Mode" for development

#### 3. Update Configuration
Replace the test configuration in `client/src/services/UnityAdsService.ts`:

```typescript
// REPLACE THIS:
gameId: 'test-game-id', // Replace with your actual game ID
testMode: true, // Set to false for production
debug: true // Set to false for production

// WITH YOUR ACTUAL GAME ID:
gameId: '1234567', // Your actual Unity Game ID
testMode: true, // Keep true for testing
debug: true // Keep true for debugging
```

#### 4. Configure Ad Placements
In Unity Dashboard:
1. Go to Monetization → Ad Placements
2. Create placements:
   - **rewardedVideo**: For rewarded ads
   - **interstitial**: For interstitial ads
   - **banner**: For banner ads

#### 5. Test Integration
1. Visit `/ad-test` in your app
2. Click "Watch Ad for Credits"
3. Verify Unity Ads load and reward system works

## Revenue Expectations

### Development/Test Phase:
- **Test Mode**: No real revenue, for testing only
- **Fill Rate**: 100% (test ads always available)
- **Revenue**: $0 (test ads don't pay)

### Production Phase:
- **Fill Rate**: 70-95% (depending on geography)
- **eCPM**: $15-50 per 1000 rewarded video completions
- **Revenue**: Real money based on user engagement

## Production Checklist

### Before Launch:
- [ ] Replace test Game ID with production Game ID
- [ ] Set `testMode: false` in UnityAdsService
- [ ] Set `debug: false` in UnityAdsService
- [ ] Test on multiple devices/browsers
- [ ] Verify reward system works correctly
- [ ] Check daily limits (10 ads) function properly

### For Mobile App:
- [ ] Install React Native Unity Ads SDK
- [ ] Use same Game ID for consistency
- [ ] Configure iOS/Android specific settings
- [ ] Test on actual mobile devices

## Technical Implementation Details

### Current Implementation:
- **Web SDK**: Unity Ads Web SDK 3.0
- **Placement IDs**: rewardedVideo, halftimeVideo, postGameVideo, interstitial, banner
- **Fallback**: Simulation mode when Unity unavailable
- **Reward System**: 500-10,000 credits per ad
- **Daily Limits**: 10 ads per day per user
- **Halftime Integration**: Mid-game ads during live matches
- **Banner Ads**: Bottom placement during gameplay

### Error Handling:
- Unity Ads SDK load failure → fallback to simulation
- Ad not ready → user-friendly error message
- Ad skipped → no reward, clear feedback
- Network issues → graceful degradation

### Revenue Tracking:
- Unity Ads results logged to database
- Placement ID tracking for analytics
- Completion rates monitored
- Revenue attribution per ad network

## Next Steps

### Week 1: Unity Ads Setup
1. **Create Unity account** (5 minutes)
2. **Update Game ID** (2 minutes)
3. **Test integration** (10 minutes)
4. **Deploy to production** (5 minutes)

### Week 2: Optimization
1. **Monitor fill rates** and performance
2. **A/B test ad placements** for user experience
3. **Analyze revenue data** and user engagement
4. **Optimize ad frequency** based on retention

### Week 3: Mobile Preparation
1. **Plan React Native transition**
2. **Set up mobile ad configurations**
3. **Test mobile Unity Ads SDK**
4. **Prepare app store submissions**

## Support Resources

### Unity Ads Documentation:
- Web SDK: https://docs.unity3d.com/Packages/com.unity.ads@4.0/manual/WebSDK.html
- Best Practices: https://docs.unity3d.com/Packages/com.unity.ads@4.0/manual/BestPracticesAndOptimization.html

### Revenue Optimization:
- Ad placement best practices
- User experience considerations
- Revenue reporting and analytics
- Cross-platform monetization strategies

## Troubleshooting

### Common Issues:
1. **Unity Ads SDK not loading**: Check internet connection and Unity CDN
2. **Test ads not showing**: Verify Game ID and test mode settings
3. **No revenue**: Ensure production mode and valid ad placements
4. **Poor fill rates**: Check geographic targeting and demand

### Debug Steps:
1. Check browser console for Unity Ads errors
2. Verify Game ID configuration
3. Test on different browsers/devices
4. Monitor network requests to Unity servers