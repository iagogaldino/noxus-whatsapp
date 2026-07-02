import { Schema, model, type InferSchemaType } from 'mongoose';

const sectorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type SectorDocument = InferSchemaType<typeof sectorSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Sector = model('Sector', sectorSchema);
