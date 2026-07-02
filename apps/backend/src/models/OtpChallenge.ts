import { Schema, model, type InferSchemaType } from 'mongoose';

const otpChallengeSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpChallengeDocument = InferSchemaType<typeof otpChallengeSchema> & {
  _id: Schema.Types.ObjectId;
};

export const OtpChallenge = model('OtpChallenge', otpChallengeSchema);
