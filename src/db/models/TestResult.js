import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'RandomBatch' },
  source: { type: String, enum: ['simulated', 'qiskit'], required: true },
  bitsLength: { type: Number, required: true },
  tests: [{
    name: String,
    statistic: Number,
    pValue: mongoose.Mixed,
    passed: Boolean,
  }],
  allPassed: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
});

testResultSchema.index({ createdAt: -1 });
testResultSchema.index({ source: 1, allPassed: 1 });

export const TestResult = mongoose.model('TestResult', testResultSchema);
