import mongoose from 'mongoose';
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`); 
        console.log(`\n MongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB Connection FAILED: ", error);
        process.exit(1);
    }
}

export default connectDB;

/*process: Process is a part of node.js, This current application running on a process, it's referrence of that process
process.exit() --> It's a method

*/