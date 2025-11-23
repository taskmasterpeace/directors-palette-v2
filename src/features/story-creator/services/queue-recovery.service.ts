/**
 * Queue Recovery Service
 * Manages checkpointing and recovery of generation queues using localStorage
 */

interface QueueCheckpoint {
    queueId: string
    projectId: string
    currentShotIndex: number
    totalShots: number
    timestamp: number
    shotIds: string[]
}

const CHECKPOINT_KEY = 'story-creator-queue-checkpoint'
const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export class QueueRecoveryService {
    /**
     * Save current queue progress to localStorage
     */
    static saveCheckpoint(checkpoint: Omit<QueueCheckpoint, 'timestamp'>): void {
        try {
            const checkpointWithTimestamp: QueueCheckpoint = {
                ...checkpoint,
                timestamp: Date.now()
            }
            localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpointWithTimestamp))
            console.log('📍 Queue checkpoint saved:', checkpoint)
        } catch (error) {
            console.error('Failed to save queue checkpoint:', error)
        }
    }

    /**
     * Load checkpoint from localStorage
     * Returns null if no checkpoint or checkpoint is stale
     */
    static loadCheckpoint(): QueueCheckpoint | null {
        try {
            const stored = localStorage.getItem(CHECKPOINT_KEY)
            if (!stored) return null

            const checkpoint: QueueCheckpoint = JSON.parse(stored)

            // Check if checkpoint is stale
            const age = Date.now() - checkpoint.timestamp
            if (age > STALE_THRESHOLD_MS) {
                console.log('⏰ Checkpoint is stale, ignoring')
                this.clearCheckpoint()
                return null
            }

            return checkpoint
        } catch (error) {
            console.error('Failed to load queue checkpoint:', error)
            return null
        }
    }

    /**
     * Clear checkpoint from localStorage
     */
    static clearCheckpoint(): void {
        try {
            localStorage.removeItem(CHECKPOINT_KEY)
            console.log('🧹 Queue checkpoint cleared')
        } catch (error) {
            console.error('Failed to clear queue checkpoint:', error)
        }
    }

    /**
     * Check if there's a recoverable checkpoint for a specific queue
     */
    static hasRecoverableCheckpoint(queueId: string): boolean {
        const checkpoint = this.loadCheckpoint()
        return checkpoint !== null && checkpoint.queueId === queueId
    }

    /**
     * Get formatted recovery message for UI
     */
    static getRecoveryMessage(checkpoint: QueueCheckpoint): string {
        const completed = checkpoint.currentShotIndex
        const total = checkpoint.totalShots
        const remaining = total - completed
        const percentage = Math.round((completed / total) * 100)

        return `Resume incomplete generation? (${completed}/${total} shots completed, ${percentage}%)`
    }

    /**
     * Update checkpoint progress
     */
    static updateProgress(queueId: string, currentShotIndex: number): void {
        const checkpoint = this.loadCheckpoint()
        if (checkpoint && checkpoint.queueId === queueId) {
            this.saveCheckpoint({
                ...checkpoint,
                currentShotIndex
            })
        }
    }
}
