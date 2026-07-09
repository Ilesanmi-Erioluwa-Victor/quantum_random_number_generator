import mongoose from 'mongoose';

const qiskitJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  backend: { type: String, required: true },
  nQubits: Number,
  shots: Number,
  circuit: String,
  status: {
    type: String,
    enum: ['submitted', 'running', 'completed', 'failed'],
    default: 'submitted',
  },
  bitsLength: Number,
  error: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

qiskitJobSchema.index({ createdAt: -1 });
qiskitJobSchema.index({ status: 1 });

export const QiskitJob = mongoose.model('QiskitJob', qiskitJobSchema);
