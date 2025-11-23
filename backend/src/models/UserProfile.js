import mongoose from 'mongoose';

/**
 * User Profile Schema
 * Stores user profile information (username, profile picture, etc.)
 */
const userProfileSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness when set
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9_]+$/, // Only lowercase letters, numbers, and underscores
  },
  profilePicture: {
    type: String, // URL or blob ID for profile picture
    default: null,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null,
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
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

// Index for username lookups
userProfileSchema.index({ username: 1 });

// Method to check if username is available
userProfileSchema.statics.isUsernameAvailable = async function(username) {
  if (!username) return false;
  const normalized = username.toLowerCase().trim();
  const existing = await this.findOne({ username: normalized });
  return !existing;
};

// Method to get profile by address or username
userProfileSchema.statics.getProfile = async function(identifier) {
  // Try by address first
  let profile = await this.findOne({ userAddress: identifier });
  if (profile) return profile;
  
  // Try by username
  profile = await this.findOne({ username: identifier.toLowerCase().trim() });
  return profile;
};

const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;

