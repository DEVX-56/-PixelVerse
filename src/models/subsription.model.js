import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId, //who is subscribing
    ref: "User",
  },
  channel: {
    type: Schema.Types.ObjectId, //whom to subscribeing
    ref: "User",
  },
},{timestamps: true});

export const Subsciption = mongoose.model("Subsciption", subscriptionSchema);
