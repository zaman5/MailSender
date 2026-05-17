import db from './db';
import { runCampaignEngine } from './routes/send';

// A simple in-memory flag to prevent the cron loop from overlapping itself
let isCronRunning = false;

export function startCronService() {
  console.log('[Cron] Background scheduler service started. Checking schedules every 60s.');
  
  // Run every 60 seconds
  setInterval(async () => {
    if (isCronRunning) return;
    isCronRunning = true;

    try {
      // Find all active campaigns
      const activeCampaigns = db.prepare("SELECT id, user_id FROM campaigns WHERE status='active'").all() as any[];
      
      for (const campaign of activeCampaigns) {
        // Trigger the engine. It will automatically validate the schedule internally.
        // If the schedule is invalid (outside window), it simply returns { started: false, message: 'Queued...' }
        // We pass undefined for reqOrigin/reqHost, so it falls back to process.env.BACKEND_URL
        await runCampaignEngine(campaign.id, campaign.user_id);
      }
    } catch (e) {
      console.error('[Cron] Error checking campaigns:', e);
    } finally {
      isCronRunning = false;
    }
  }, 60 * 1000); // 1 minute
}
