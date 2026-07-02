import { Schema, model, type InferSchemaType } from 'mongoose';

const chatConversationSchema = new Schema(
  {
    instanceId: {
      type: String,
      required: true,
      index: true,
    },
    chatId: {
      type: String,
      required: true,
    },
    participantName: {
      type: String,
      required: true,
    },
    lastMessageAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastMessageExternalId: {
      type: String,
      required: true,
    },
    lastMessageText: {
      type: String,
      default: '',
    },
    lastMessageFromMe: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

chatConversationSchema.index({ instanceId: 1, chatId: 1 }, { unique: true });
chatConversationSchema.index({ instanceId: 1, lastMessageAt: -1 });

export type ChatConversationDocument = InferSchemaType<typeof chatConversationSchema> & {
  _id: Schema.Types.ObjectId;
};

export const ChatConversation = model('ChatConversation', chatConversationSchema);
