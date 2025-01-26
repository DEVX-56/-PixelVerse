//This middleware will verify that user exists or not
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req, _, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        // if you have no token
        if(!token){
            throw new ApiError(401, "Unauthorized request");
        }
    
        //if token available
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        //if user not exists
        if(!user){
            throw new ApiError(401, "Ivalid access Token");
        }
    
        //if user exist
        req.user = user; //give a new object to request
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access Token");
    }
})