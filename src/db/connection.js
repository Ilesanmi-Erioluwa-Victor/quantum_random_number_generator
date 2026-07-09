import mongoose from 'mongoose';

let isConnected = false;

mongoose.connection.on('error', () => {});
mongoose.connection.on('reconnectFailed', () => {});

export async function connectDB(uri) {
  if (isConnected) return;
  const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/qrng';
  try {
    mongoose.set('autoReconnect', false);
    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });
    isConnected = true;
  } catch (err) {
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
