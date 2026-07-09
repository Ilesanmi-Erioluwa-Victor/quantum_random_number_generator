import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  keyId: { type: String, required: true },
  originalLength: Number,
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
