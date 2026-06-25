import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
    progress: { type: Number, default: 0 }, // seconds watched (resume point)
    completed: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// one history row per (user, video); upserted as the user watches
watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, lastWatchedAt: -1 });

export const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);
