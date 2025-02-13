//require('dotenv').config({path: './env'});
import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
    path: './.env'
})


connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000, ()=>{
    console.log(`Server is running at PORT: ${process.env.PORT}`);
  })
})
.catch((err)=>{
  console.log("MONGO DB Connection Error !!!", err);
})





















/*   This way we can also write the db connection code
import express from 'express';

const app = express();

//connecting Database using IIFE Function
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on('error', (error)=>{
        console.log("Error: ", error);
        throw error;
    })

    app.listen(process.env.PORT, ()=>{
        console.log(`App is running on PORT: ${process.env.PORT}`);
    })


  } catch (error) {
    console.log("ERROR: ", error);
    throw error;
  }
})();

*/