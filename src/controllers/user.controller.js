import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//This method will generate the tokens
const generateAccessAndRefreshTokens = async (userId) => {
  //it will take a userId
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; // save refesh token to the DB
    user.save({ validateBeforeSave: false });
    //now return access and refresh tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Some thing went wrong while generating refresh and access tokens"
    );
  }
};

//Register new User
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

  if (existedUser) {
    // if exists send error
    throw new ApiError(409, "User with gien email or username already exists");
  }

  //multer gives us req.files access
  const avatarLocalPath = req.files?.avatar[0]?.path; //local path of avatar
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    //if no avatar available send error
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath); // if avatar available upload on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath); // if coverImage available upload on cloudinary

  if (!avatar) {
    // if avatar have not uploader send error
    throw new ApiError(400, "Avatar is required");
  }

  // if every things works fine then create user
  const user = await User.create({
    fullName,
    avatar: avatar.url, //in DB we only store avatars URL not full avatar
    coverImage: coverImage?.url || "", //this validation for, may be coverImage does not exists
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    // when returning object exclude these 2 field
    "-password -refreshToken" // excluding these two field all fields will come
  );

  if (!createdUser) {
    // if not created user throw error
    throw new ApiError(500, "Something went wrong, while registering user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully") //created class of ApiResponse Object
  );
});

//login
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body; // extract data from request body

  if (!(username || email)) {
    throw new ApiError(400, "Username or emal is required");
  }

  //now find a user with this email or username
  const user = await User.findOne({
    $or: [{ username }, { email }], //this "or" is mongoDB operator
  });

  //if we don't found a user
  if (!user) {
    throw new ApiError(404, "User doesn't exists");
  }

  //if user found then match password
  const isPasswordValid = await user.isPasswordCorrect(password);

  //if user give a n invalidPassword
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password");
  }

  //if password is valid then generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  ); //we have generate the token also destructure it

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //options for cookies
  const options = {
    //using thse two securitymeasure now the cookies are only modifyable from server
    httpOnly: true,
    secure: true,
  };

  //response send to user
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

//logout
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

//Creating end point, when API hits this end point then tokens will reassign
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; //This "refreshToken" is coimg from user, theres another token stored in DB

  //if refresh token does not exists
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    //verify incoing refesh token
    const decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodeToken?._id);
    // if user not exists
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refreshed token is expired or used");
    }

    //generating new user tokens
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//Method for changeing
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  //if given old password is wrong
  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid Old Password");
  }
  //if given old password is right
  user.password = newPassword;
  await user.save({validateBeforeSave: false});
  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

//current User
const getCurrentUser = asyncHandler(async(req, res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"User fetched successfully"))
})

//update account details
const updateAccountDetails = asyncHandler(async(req, res)=>{
  const {fullName, email} = req.body;

  // if fullname and email both are not present
  if(!fullName || !email){
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email
      }
    },
    {new: true}  // means after update the information will be returned
  ).select ("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// update Avatar
const updateUserAvatar = asyncHandler(async(req, res)=>{
  const avatarLocalPath = req.file?.path;

  //if avatar file path does not exists
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is missing");
  }

  //if avatar file exists
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url){
    throw new ApiError(400, "Error while uploading on Avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Avatar updated successfully"));
})

//update cover image
const updateUserCoverImage = asyncHandler(async(req, res)=>{
  const coverImageLocalPath = req.file?.path;

  //if avatar file path does not exists
  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover image file is missing");
  }

  //if avatar file exists
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url){
    throw new ApiError(400, "Error while uploading on Avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Cover image updated successfully"));
})



export { 
  registerUser,
  loginUser, 
  logoutUser, 
  refreshAccessToken, 
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};

/*
using $ we can use multiple operators.
*/

/*                        Steps to register a user
- get user details from frontend
- validation - not empty
- check if user is already exists: username, email
- check for images, check for avatar
- if exists upload them into clouinary
- create user object - create entry in DB
- Remove password and refresh token field from response
- check for user creation or not
- If user creates successfully, return response else return error


                      Steps to Login a user
- Get Data from request body
- username or email validation
- find the given user
-  Password Check
- Generate access and refresh tokens
- send cookies
- send aresponse for successfully login


                          Steps to logout a user
- remove cookies
- reset refresh token
*/
