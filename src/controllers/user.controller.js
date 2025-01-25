import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
  // extract all data points from req.body
  const { fullName, email, username, password } = req.body;
  //console.log("email: ", email);

  //here wea re checking recieved data are empty or not
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // here we are checking there are any duplicate user in this username or email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if(existedUser){  // if exists send error
    throw new ApiError(409, "User with gien email or username already exists");
  }

  //multer gives us req.files access
  const avatarLocalPath = req.files?.avatar[0]?.path; //local path of avatar
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;


  let coverImageLocalPath;
  if(req.files&& Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath){ //if no avatar available send error
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath); // if avatar available upload on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath); // if coverImage available upload on cloudinary

  if(!avatar){  // if avatar have not uploader send error
    throw new ApiError(400, "Avatar is required");
  }

  // if every things works fine then create user
  const user = await User.create({ 
    fullName,
    avatar: avatar.url, //in DB we only store avatars URL not full avatar
    coverImage: coverImage?.url || "",  //this validation for, may be coverImage does not exists
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select( // when returning object exclude these 2 field
    "-password -refreshToken"  // excluding these two field all fields will come
  )

  if(!createdUser){  // if not created user throw error
    throw new ApiError(500, "Something went wrong, while registering user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")  //created class of ApiResponse Object
  )



});

export { registerUser };

/*
using $ we can use multiple operators.
*/

/* Steps to register a user
- get user details from frontend
- validation - not empty
- check if user is already exists: username, email
- check for images, check for avatar
- if exists upload them into clouinary
- create user object - create entry in DB
- Remove password and refresh token field from response
- check for user creation or not
- If user creates successfully, return response else return error
*/