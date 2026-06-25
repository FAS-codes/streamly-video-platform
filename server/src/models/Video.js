import mongoose from 'mongoose';

export const VIDEO_STATUS = {
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
};

const renditionSchema = new mongoose.Schema(
  { height: Number, bandwidth: Number, playlist: String },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: { type: String, enum: Object.values(VIDEO_STATUS), default: VIDEO_STATUS.UPLOADED, index: true },
    statusMessage: { type: String, default: '' },

    originalFilename: String,
    sourcePath: String, // raw uploaded file (relative to storage root)

    // transcode output
    duration: { type: Number, default: 0 }, // seconds
    masterPlaylist: String, // relative path to master.m3u8
    thumbnail: String, // relative path
    renditions: [renditionSchema],

    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Video = mongoose.model('Video', videoSchema);
