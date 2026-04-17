import { model, Schema, Document } from 'mongoose';
import { IUser } from '../types';

export type UserDocument = IUser & Document;

const userSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    password: {
      type: String,
      required: true,
    },
    packages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Package',
      },
    ],
  },
  {
    timestamps: true,
  },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

const User = model<UserDocument>('User', userSchema);

export default User;
