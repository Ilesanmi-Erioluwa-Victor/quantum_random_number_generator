import mongoose from 'mongoose';

const keyGenerationSchema = new mongoose.Schema({
  keyType: {
    type: String,
    enum: ['AES', 'HMAC-SHA256', 'ECDSA', 'IV', 'SALT'],
    required: true,
  },
  bitLength: Number,
  keyId: String,
  hexPreview: { type: String, maxlength: 20 },
  source: { type: String, enum: ['simulated', 'qiskit'], default: 'simulated' },
  createdAt: { type: Date, default: Date.now },
});

keyGenerationSchema.index({ createdAt: -1 });

export const KeyGeneration = mongoose.model('KeyGeneration', keyGenerationSchema);
