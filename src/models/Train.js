'use strict';

const mongoose = require('mongoose');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MOVEMENT_TYPES = ['standard', 'LZ', 'other'];
const STATUSES = ['active', 'completed', 'cancelled'];

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const trainSchema = new mongoose.Schema(
  {
    /**
     * The numeric train number. Max 6 digits (1–999999).
     * Must be unique among all trains with status = "active".
     * LZ or other movement designators are stored separately.
     */
    trainNumber: {
      type: Number,
      required: [true, 'Train number is required'],
      min: [1, 'Train number must be a positive number'],
      max: [999999, 'Train number cannot exceed 6 digits'],
      validate: {
        validator: Number.isInteger,
        message: 'Train number must be an integer',
      },
    },

    /**
     * Movement type of the train. Kept separate from trainNumber as per spec.
     *  - standard : Regular passenger/cargo service
     *  - LZ       : Light-engine / locomotive-only movement
     *  - other    : Any other movement type
     */
    movementType: {
      type: String,
      enum: {
        values: MOVEMENT_TYPES,
        message: `Movement type must be one of: ${MOVEMENT_TYPES.join(', ')}`,
      },
      default: 'standard',
    },

    /** Current lifecycle status of the rescue request. */
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: `Status must be one of: ${STATUSES.join(', ')}`,
      },
      default: 'active',
    },

    /** Free-text description of the rescue situation. */
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    /** Contact information of the person/operator publishing the request. */
    contactInfo: {
      type: String,
      trim: true,
      maxlength: [200, 'Contact info cannot exceed 200 characters'],
    },

    /** Location where the train is stranded or in need of rescue. */
    location: {
      type: String,
      trim: true,
      maxlength: [300, 'Location cannot exceed 300 characters'],
    },

    /** Timestamp when the train status was last changed to non-active. */
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ──────────────────────────────────────────────────────────────────

/**
 * Compound index used for the duplicate-active-train-number check.
 *
 * We use a partial/sparse unique index only on documents where status = "active".
 * This allows the same trainNumber to be reused once a previous request is
 * completed or cancelled — without any extra cleanup needed.
 *
 * If two concurrent requests slip through the application-layer check, this
 * index acts as the final safety net and causes Mongoose to throw a duplicate
 * key error (code 11000).
 */
trainSchema.index(
  { trainNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'unique_active_trainNumber',
  }
);

// General-purpose query indexes
trainSchema.index({ status: 1 });
trainSchema.index({ createdAt: -1 });

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

/** Record resolvedAt timestamp when a request is completed or cancelled. */
trainSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status !== 'active') {
    this.resolvedAt = new Date();
  }
  next();
});

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

const Train = mongoose.model('Train', trainSchema);

module.exports = Train;
module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;
module.exports.STATUSES = STATUSES;
