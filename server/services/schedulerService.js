/**
 * @fileoverview Scheduler Service - Runs periodic cleanup tasks
 * @description Automatically deletes expired receipts and flags expiring ones
 */

import receiptService from './receiptService.js';
import { logger } from '../utils/index.js';

// Run cleanup daily at 3 AM
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Scheduler Service - Manages periodic background tasks
 */
class SchedulerService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('⏰ Scheduler already running');
      return;
    }

    logger.info('⏰ Starting scheduler service...');
    
    // Run immediately on startup (after a short delay)
    setTimeout(() => this.runCleanupTasks(), 10000);

    // Then run every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.runCleanupTasks();
    }, CLEANUP_INTERVAL_MS);

    this.isRunning = true;
    logger.info('✅ Scheduler started - cleanup runs every 24 hours');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    logger.info('⏹️ Scheduler stopped');
  }

  /**
   * Run all cleanup tasks
   */
  async runCleanupTasks() {
    logger.info('🧹 Running scheduled cleanup tasks...');

    try {
      // 1. Flag receipts expiring within 30 days
      const flagged = await receiptService.flagExpiringReceipts();
      logger.info(`   ⚠️ Flagged ${flagged} receipts as expiring soon`);

      // 2. Delete expired receipts (older than 2 years)
      const cleanup = await receiptService.cleanupExpiredReceipts();
      logger.info(`   🗑️ Deleted ${cleanup.deleted} expired receipts`);

      if (cleanup.failed > 0) {
        logger.warn(`   ❌ Failed to delete ${cleanup.failed} receipts`);
      }

      logger.info('✅ Cleanup tasks completed');
    } catch (error) {
      logger.error('❌ Error running cleanup tasks:', error);
    }
  }

  /**
   * Manually trigger cleanup (for testing or admin use)
   */
  async triggerCleanup() {
    return this.runCleanupTasks();
  }
}

// Export singleton instance
const schedulerService = new SchedulerService();
export default schedulerService;
