import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  console.log(`[db] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
