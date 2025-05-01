import mongoose from 'mongoose';

export interface IEntry extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  mood: number;
  createdAt: Date;
  updatedAt: Date;
}

const entrySchema = new mongoose.Schema<IEntry>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    mood: { type: Number, required: true, min: 1, max: 5 },
  },
  {
    timestamps: true,
  }
);

// Add index for better query performance
entrySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Entry || mongoose.model<IEntry>('Entry', entrySchema); 