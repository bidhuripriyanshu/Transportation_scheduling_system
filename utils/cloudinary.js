const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });
    
const uploadOnCloudinary = async(localFilePath)=>{
     try{
        if(!localFilePath) return null;
        //uplaod the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
        })
        //File has been uploaded successfully
        console.log("file is uploaded on cloudinary",
            response.url);
            return response;
    }
    catch(error){
       fs.unlinkSync(localFilePath);
       // temporary file has been remove from localfiles
    }
}   

module.exports = { uploadOnCloudinary };