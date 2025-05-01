import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  name?: string;
  image?: string;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: String,
    image: String,
    emailVerified: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 