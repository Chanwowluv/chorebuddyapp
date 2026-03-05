/**
 * Set up trial period for new families
 */
export async function initializeTrialPeriod(data, context) {
  // Only set trial if no subscription_tier specified
  if (!data.subscription_tier) {
    data.subscription_tier = 'free';
  }
  
  // If paid tier, set 14-day trial
  if (['premium', 'family_plus'.includes(data.subscription_tier)) {
    data.subscription_status = 'trial';
    
    // Trial period: 14 days
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    data.trial_ends_at = trialEnd.toISOString();
  } else {
    data.subscription_status = 'active';
  }
  
  return data;
}
