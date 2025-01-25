import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //here we use cloudinary URL
      required: true,
    },
    coverImage: {
      type: String, //here we use cloudinary URL
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is Required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // if password is not modified then don't update & save it.

  this.password = await bcrypt.hash(this.password, 10);
  next();
}); //using this "pre" middleware encrypt the password before save it.

//using this "methods" method we can create our own method to do something
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {  //1st payload name : coming from DB
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    },
  )
}

userSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {  //1st payload name : coming from DB
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    },
  )
}

export const User = mongoose.model("User", userSchema);

/*
bcypt used to encrypt the password, 
theres a "hash" method use to encrypt, it takes two parameter
1. password, which we want to hash
2. Number of rounds, here we have to pass a number
after call next

bcrypt also provids a method called "compare" use to compare passwords, it returns true or false
it takes two parameter
1. user given password in String
2. Encrypted Password

Though these are crypographic process so takes times, thats shy these are asynchronous 
*/
