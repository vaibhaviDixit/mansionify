const Listing=require("../models/listings.js")
// const {listingSchema}=require("../schema.js");
const ExpressError=require("../utils/ExpressError.js");



module.exports.isLoggedIn=(req,res,next)=>{
    console.log(req.user);
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
    
    return res.redirect("/login");}
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing.owner._id.equals(res.locals.currUser._id)) {
        // req.flash("error", "You  are not Authorized ");
        return res.redirect(`/listings/${id}`);
    }

    // If the user is the owner, proceed to the next middleware or route handler
    next();

};