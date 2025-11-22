import mongoose from 'mongoose';

/**
 * User Blob Schema
 * Stores user address -> blob IDs mapping (like the NFT project)
 */
const userBlobSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    index: true, // Index for fast lookups
  },
  blobIds: [{
    type: String,
    required: true,
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for userAddress + blobId lookups
userBlobSchema.index({ userAddress: 1, blobIds: 1 });

// Method to add a blob ID (avoid duplicates)
userBlobSchema.methods.addBlobId = function(blobId, metadata = {}) {
  if (!this.blobIds.includes(blobId)) {
    this.blobIds.push(blobId);
    if (metadata && Object.keys(metadata).length > 0) {
      this.metadata.set(blobId, {
        ...metadata,
        addedAt: Date.now(),
      });
    }
    this.updatedAt = Date.now();
    return true;
  }
  return false;
};

// Method to remove a blob ID
userBlobSchema.methods.removeBlobId = function(blobId) {
  const index = this.blobIds.indexOf(blobId);
  if (index > -1) {
    this.blobIds.splice(index, 1);
    this.metadata.delete(blobId);
    this.updatedAt = Date.now();
    return true;
  }
  return false;
};

// Static method to find or create user blob document
userBlobSchema.statics.findOrCreate = async function(userAddress) {
  let userBlob = await this.findOne({ userAddress });
  if (!userBlob) {
    userBlob = await this.create({ userAddress, blobIds: [] });
  }
  return userBlob;
};

export const UserBlob = mongoose.models.UserBlob || mongoose.model('UserBlob', userBlobSchema);

