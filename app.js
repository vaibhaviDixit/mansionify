const express = require('express');
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
require('dotenv').config();
const dbUrl = "mongodb+srv://vaibhavidixit511:VhVExySyQigUl5fh@cluster0.0ptb2ik.mongodb.net/?retryWrites=true&w=majority";
const multer = require('multer')
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage:storage });
const session = require("express-session");
const MongoStore=require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/User");
const Listing=require("./models/listings.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = "pk.eyJ1IjoiZGVsdGEtc3R1ZHVlbnQiLCJhIjoiY2xvMDk0MTVhMTJ3ZDJrcGR5ZDFkaHl4ciJ9.Gj2VU1wvxc7rFVt5E4KLOQ";
const WrapAsync=require("./utils/WrapAsync.js");
// console.log(mapToken);
const ExpressError=require("./utils/ExpressError.js");
const geoCodingClient = mbxGeocoding({ accessToken: mapToken });
// const fetch = require('node-fetch');
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "public")));


const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:"SECRET",
    },
    touchAfter:24*3600,


});
store.on("error",()=>{
    console.log("Error in Mongo STORE",err);
});

// Session Configuration
const sessionOptions = {
    store,
    secret: "SECRET",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires 7 days from now
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // Alternatively, you can remove this line if not needed
    },
};


// Passport Configuration
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        'frame-src https://console.dialogflow.com/',
        "default-src 'none'; font-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );

    res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
    
    next();
});


// MongoDB Connection
main().then(() => {
    console.log("Connected to DB");
}).catch((err) => {
    console.error("Error connecting to DB:", err);
});

async function main() {
    await mongoose.connect(dbUrl);
}







// Set local variables middleware
app.use((req, res, next) => {
    res.locals.currUser=req.user;
    res.locals.otp = req.user;
    res.locals.email = req.user ? req.user.email : null;
    // res.locals.success = req.flash("success");
    // res.locals.error = req.flash("error");
    next();
});




//home

app.get('/home',(req,res)=>{
    console.log(res.locals.currUser);
    console.log(process.env.CLOUD_NAME);
    res.render('listings/home.ejs');
});

//Sign Up
app.get('/signup', (req, res) => {
    res.render("users/signup.ejs");
});
app.post('/signup', async (req, res) => {
    try {
        const { username, email, phone, city,aadhaar} = req.body.user;
        // console.log(username);
        // const data =await https://documenter.getpostman.com/view/15230345/2s9XxyPsZS#24dfb751-5817-4765-9a6e-5eeef0551151;
        const pass = req.body.user.password;
        const newUser = new User({ email, username, phone, city });
        console.log(newUser);
        const registeredUser = await User.register(newUser, pass);
        res.redirect("/home");
    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).send("Fail: " + error.message);
    }
});
app.post('/verify',async(req,res)=>{
    const id=req.body.listid;
    let fetchListing = await Listing.findById(id);
    fetchListing.verified=true;
    console.log(fetchListing);
    await fetchListing.save();
    res.redirect("/listings")
})





//Login
app.get('/login', (req, res) => {
    res.render('users/login.ejs');
});

app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }),
    function (req, res) {
        console.log("logged");
        res.redirect('/home');
    });

//logout

app.get('/logout',(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        
        res.redirect("/home");
    })
});

//listings
app.get('/listings',async(req,res)=>{

    let allisting = await Listing.find({});
    console.log(allisting);
    res.render('listings/show.ejs',{allisting});
});
app.get('/listings/new', async (req, res) => {
    res.render('listings/new.ejs');
});

app.post('/listings', async (req, res) => {
    try {
        const response = await geoCodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
        }).send();

        console.log("hello");
        // console.log(req.file);
        // Assuming your form sends data directly in req.body without nesting
        const data = req.body.listing;

        data.verified = false;
        const newListing = new Listing(data);
        console.log(res.locals.currUser);
        
        // Assuming req.user is properly populated with authenticated user's information
        if (req.user) {
            newListing.owner = req.user._id;
        } else {
            // Handle case where user is not authenticated
            throw new Error("User not authenticated");
        }

        // Assuming response.body.features[0].geometry holds the desired geometry
        newListing.geometry = response.body.features[0].geometry;

        // newListing.image = { filename }; // Assign the filename only if it exists
        await newListing.save();
        console.log(newListing);
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// app.post('/listings', upload.single("listing[image]"),(req,res)=>{
//     res.send(req.file);
// });

app.delete('/listings/:id',async(req,res)=>{
    let { id } = req.params;
    console.log(id);
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    
    res.redirect("/listings");
});

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found"));
});




























app.listen(5000, () => {
    console.log("Server is listening on port 3000");
});




