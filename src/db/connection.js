import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(uri) {
  if (isConnected) return;
  const connectionUri = uri || process.env.MONGODB_URI;
  try {
    await mongoose.connect(connectionUri);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB connection failed, running without database:', err.message);
    isConnected = false;
  }
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
