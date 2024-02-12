const mongoose=require("mongoose");
const Schema =mongoose.Schema;

const User =require("./User.js")
const listingSchema=new Schema({
    title:{
        type:String,
        
    },
    description:String,
    image:{
        url:String,
        filename:String,
        },
    price:Number,
    location:String,
    area:String,
    jilha:String,
    ulpin:Number,
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    taluka:String,
    village:String,
    geometry: {
        type: {
            type: String, // Don't do { location: { type: String } }
            enum: ['Point'], // 'location.type' must be 'Point'
            
        },
        coordinates: {
            type: [Number],
            
        }
    },
    verified:Boolean,
});

const Listing=mongoose.model("Listing",listingSchema);
module.exports=Listing;