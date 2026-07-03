import { Schema, model, type InferSchemaType } from 'mongoose';

const chatMessageSchema = new Schema(
  {
    instanceId: {
      type: String,
      required: true,
      index: true,
    },
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    jid: {
      type: String,
      required: true,
    },
    fromMe: {
      type: Boolean,
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'conversation',
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    mediaUrl: String,
    mediaMimeType: String,
    mediaFileName: String,
    mediaSize: Number,
    mediaGridFsId: String,
    senderJid: String,
    senderName: String,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chatMessageSchema.index({ instanceId: 1, externalId: 1 }, { unique: true });
chatMessageSchema.index({ instanceId: 1, chatId: 1, timestamp: -1 });

export type ChatMessageDocument = InferSchemaType<typeof chatMessageSchema> & {
  _id: Schema.Types.ObjectId;
};

export const ChatMessage = model('ChatMessage', chatMessageSchema);
