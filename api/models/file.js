const mongoose = require('mongoose');


const fileSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "File name is required"]
    },
    url:{
        type:String,
    },
    size:{
        type:Number,
        required:[true, "File size is required"]
    },
    path:{
        type:String,
        required:[true, "File path is required"]
    },
    type:{
        type:String,
        required:[true, "File mimetype is required"]
    },
    status:{
        type:String,
        required:[true, "File status is required"],
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    hlsurl:{
        type:String
    },
    fileurl:{
        type:String
    }
}, { timestamps: true });

const File =mongoose.model('File', fileSchema);

module.exports = {File};