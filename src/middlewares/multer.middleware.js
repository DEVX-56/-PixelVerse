import multer from "multer";

//here we are using diskstorage to upload files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); // folder where all files will be saved
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
});

/*
Here we have not changes file name because, the files will store the in the disk only for some amount of times after some time that will be uploaded to cloudinary that's why we have not changed the filnames.
*/
