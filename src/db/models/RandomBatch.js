import mongoose from 'mongoose';

const randomBatchSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['simulated', 'qiskit'],
    required: true,
  },
  bitsLength: { type: Number, required: true },
  bits: { type: String, required: true },
  metadata: {
    nQubits: Number,
    shots: Number,
    jobId: String,
    circuit: String,
  },
  testResults: [{
    name: String,
    statistic: Number,
    pValue: mongoose.Mixed,
    passed: Boolean,
  }],
  createdAt: { type: Date, default: Date.now },
});

randomBatchSchema.index({ createdAt: -1 });
randomBatchSchema.index({ source: 1, createdAt: -1 });

export const RandomBatch = mongoose.model('RandomBatch', randomBatchSchema);
