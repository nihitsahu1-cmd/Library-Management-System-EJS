require("dotenv").config();


let express = require('express');
let session = require('express-session');
let mongoose = require('mongoose');
let nodemailer=require('nodemailer');
let bcrypt=require('bcrypt');
let multer = require("multer");

let User = require('./user');
let Book = require('./Book');
let Issue = require('./Issue');
let History = require('./History');
let path = require("path");
let fs = require("fs");
let app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log(err);
});



app.use(session({
    secret: 'librarysecret',
    resave: false,
    saveUninitialized: false
}));


const storage = multer.diskStorage({

    destination: function(req, file, cb){
        cb(null, "uploads");
    },

    filename: function(req, file, cb){
        cb(null, Date.now() + "-" + file.originalname);
    }

});


const upload = multer({
    storage: storage
});



function isLoggedIn(req, res, next) {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    next();
}

function isAdmin(req, res, next) {

    if (req.session.user.role !== 'admin') {
        return res.render('OnlyAdmin.ejs');
    }

    next();
}

let transporter=nodemailer.createTransport({
    host:'smtp.gmail.com',
    port:587,
    secure:false,
    auth:{
        user:"nihitsahu1@gmail.com",
        pass:'mubryfeizflvacda'
    }
})



app.get('/issuedBooks', isLoggedIn, isAdmin, async (req, res) => {
    const books = await Issue.find();

    res.render('issuedBooks', {
        books,
        user: req.session.user
    });
});


app.get("/fineLists", isLoggedIn, isAdmin, async (req, res) => {

    const fines = await History.find({
        fine: { $gt: 0 }
    }).sort({ returnDate: -1 });

    res.render("fineLists", {
        fines
    });

});

app.get("/dashboard",isAdmin,isLoggedIn, async (req, res) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    if (req.session.user.role === "admin") {
        return res.render("dashboardAdmin", {
            user: req.session.user
        });
    }

    return res.redirect("/login");

});

app.get('/bookHistory', isLoggedIn, async (req, res) => {

    const history = await History.find()
        .sort({ issueDate: -1 });

    res.render('bookHistory', {
        history
    });
});

app.get('/add-book', isLoggedIn, isAdmin, (req, res) => {
    res.render('addBook');
});



app.get("/dashboardAdmin", isLoggedIn, isAdmin, (req, res) => {
    res.render("dashboardAdmin", {
        user: req.session.user
    });
});



app.get("/register", (req, res) => {
    res.render("register", {
        message: null
    });
});

app.get('/History', isLoggedIn, async (req, res) => {

           const history = await History.find({
            studentEmail: req.session.user.email
        }).sort({
            issueDate: -1
        });

        console.log("History Data:", history);

        res.render('History', {
            history,
            user: req.session.user
        });

});

app.get('/addBook',isAdmin,isLoggedIn, (req, res) => {
    res.render('addBook');
});



app.get('/login', (req, res) => {
    res.render('login',
        {message:null
    });
});



app.post('/register', upload.single("photo"), async (req, res) => {

    
    let {name, email, password, confirmPassword, } = req.body;
    let photo = req.file ? req.file.filename : null;


    if (password !== confirmPassword) {
    return res.render("register", {
        message: "Password and Confirm Password do not match!"
    });
}

const hashedPassword = await bcrypt.hash(password, 10);

await User.create({name,email,password: hashedPassword,photo
});
     /*await transporter.sendMail({
        from: '"Nihit Sahu" <nihitsahu1@gmail.com>',
        to: email,
        subject: "Library Registration Successful",
        html: `
            <h2>Welcome ${name}</h2>

            <p>Your registration has been completed successfully.</p>

            <p>Thank you for joining our Library Management System.</p>`,
        attachments: [
        {
            filename: "library.jpg",
            path: "./images/library.png"
        }
    ]

    });

    res.render('success');*/
});


app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
       return res.render("login", {
        message: "User Not Found..!"
    });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        return res.render("login",{
            message:"PassWord Do Not Match !! Please fill Coreect Password"
        });
    }


    req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo
    };


    if (user.role === "admin") {

    return res.render("dashboardAdmin", {
        user: user
    });
}      else {
        return res.redirect("/dashboardStudent");
    }

});



app.get('/', (req, res) => {

    res.render('dashboard', {
        user: req.session.user
    });

});


app.get("/forgot-password", (req, res) => {
    res.render("forgotPassword",{message:null});
});



app.post("/forgot-password", async (req, res) => {
    try {

        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.render("forgotPassword", {
                message: "Sorry!! Email Not Found"
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);

        req.session.otp = otp;
        req.session.resetEmail = email;

        await transporter.sendMail({
            from: '"Library Management System" <nihitsahu1@gmail.com>',
            to: email,
            subject: "Password Reset OTP",
            html: `
                <h2>Hello ${user.name}</h2>

                <p>Your Password Reset OTP is:</p>

                <h1 style="color:grey;">${otp}</h1>

                <p>This OTP is valid for 5 minutes.</p>

                <p><b>Library Management System</b></p>
            `
        });

        // OTP page par bhejo
        res.redirect("/verify-otp");

    } catch (err) {
        console.log(err);

        res.render("forgotPassword", {
            message: "Something went wrong!"
        });
    }
});


app.get("/reset-password", (req, res) => {
    res.render("resetPassword", { message: null });
});

app.post("/reset-password", async (req, res) => {

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render("resetPassword", {
            message: "Passwords do not match!"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findOneAndUpdate(
        { email: req.session.resetEmail },
        { password: hashedPassword }
    );

    // Session clear
    req.session.otp = null;
    req.session.resetEmail = null;

    res.redirect("/login");

});


app.post("/verify-otp", (req, res) => {

    const { otp } = req.body;

    if (Number(otp) === req.session.otp) {

        return res.redirect("/reset-password");

    }

    res.render("verifyOTP", {
        message: "Invalid OTP"
    });

});



app.get("/verify-otp", (req, res) => {
    res.render("verifyOTP", { message: null });
});


app.get("/EditImage", async (req, res) => {

    const user = await User.findById(req.session.user._id);

    res.render("EditImage", {
        user
    });

});



app.post("/profile/edit", upload.single("photo"), async (req, res) => {
    try {

        if (!req.session.user) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.user._id);

        if (!user) {
            return res.send("User not found");
        }

        if (req.file) {

            if (user.photo) {

                const oldPhotoPath = path.join(
                    __dirname,
                    "public",
                    "uploads",
                    user.photo
                );

                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            }

            user.photo = req.file.filename;
        }

        await user.save();

        req.session.user.photo = user.photo;

        res.redirect("/dashboardStudent");

    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});


app.get('/dashboardStudent', isLoggedIn, async (req, res) => {

    const result = await Book.aggregate([
        {
            $group: {
                _id: null,
                totalBooks: { $sum: "$quantity" }
            }
        }
    ]);

    const totalBooks = result.length ? result[0].totalBooks : 0;

    const issueBooks = await Issue.countDocuments({
        studentEmail: req.session.user.email
    });

   res.render("dashboardStudent", {
    user: req.session.user,
    totalBooks,
    issueBooks,
    message: null
});
});



app.post('/books', isLoggedIn, isAdmin, upload.single("photo"), async (req, res) => {

    const { title, author, quantity } = req.body;

    await Book.create({
        title,
        author,
        quantity,
        photo: req.file.filename
    });

    const books = await Book.find();

    res.render("books", {
        books,
        message: "Book Added Successfully !!"
    });

});


// Ye Admin Pannel Ka Book Show Hai 
app.get('/books', isLoggedIn, async (req, res) => {

    const books = await Book.find();

    res.render('books', {
        books,
        message: null
    });

});


// Ye Student Pannel Ka Book Show Hai 
app.get('/studentBooks',isLoggedIn,async (req, res) => {
    let books=await Book.find();
res.render("studentBooks", {
    books,
    user: req.session.user,
    message: null
});
});


app.get('/delete-book/:id', isLoggedIn, isAdmin, async (req, res) => {

    await Book.findByIdAndDelete(req.params.id);

    res.redirect('/books');
});



app.get('/editBook/:id', isLoggedIn, isAdmin, async (req, res) => {

    const book = await Book.findById(req.params.id);

    if (!book) {
        return res.send("Book not found");
    }

    res.render('editBook', { book });
});


app.post('/editBook/:id', isLoggedIn,isAdmin, async (req, res) => {

    let { title, author, quantity } = req.body;

    await Book.findByIdAndUpdate(req.params.id, {title, author,quantity });

    res.redirect('/books');
});


app.get("/StudentIssuebooks", isLoggedIn, async (req, res) => {

         const issuedBooks = await Issue.find({
            
        studentEmail: req.session.user.email
        });

        res.render("StudentIssuebooks", {
            user: req.session.user,
            issuedBooks
        });

});



app.get('/issueBooks/:id', isLoggedIn, async (req, res) => {

    try {

        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.render('BookNot');
        }

        if (book.quantity <= 0) {
            return res.render('BookNot');
        }

       const alreadyIssued = await Issue.findOne({
        studentEmail: req.session.user.email,
         bookId: book._id
            });

          if (alreadyIssued) {
          const books = await Book.find();

         return res.render("studentBooks", {
    books,
    user: req.session.user,
    message: "You have already issued this book!"
             });           
             }

        const issuedCount = await Issue.countDocuments({
        studentEmail: req.session.user.email
        });

        if (issuedCount >= 3) {
const books = await Book.find();

          return res.render("studentBooks", {
         books,
     user: req.session.user,
             message: "You have already issued 3 books. You cannot issue more books."
           });           }

        await Issue.create({
            studentName: req.session.user.name,
            studentEmail: req.session.user.email,
            bookId: book._id,
            bookTitle: book.title,
            issueDate: new Date(),
            returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        });

         await History.create({
         bookId: book._id,
         title: book.title,
         author: book.author,
         studentName: req.session.user.name,
         studentEmail: req.session.user.email,
         issueDate: new Date(),
         status: "Issued"
         });
book.quantity--;
await book.save();

const books = await Book.find();

return res.render("studentBooks", {
    books,
    user: req.session.user,
    message: "Book Issued Successfully! Thank You!!"
});



    
    } catch (err) {
        console.log(err);
        res.send(err.message);
    }

});


app.post('/issueBooks/:id', isLoggedIn, async (req, res) => {

    let { studentName, studentEmail } = req.body;

    let book = await Book.findById(req.params.id);

    if (!book) {
        return res.render('BookNot.ejs');
    }

    if (book.quantity <= 0) {
        return res.render('BookNot.ejs');
    }

    await Issue.create({
        studentName: req.session.user.name,
        studentEmail: req.session.user.email,
        bookId: book._id,
        bookTitle: book.title,
        issueDate: new Date(),
        returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });
        book.quantity -= 1;
    await book.save();

    res.redirect('/issuedBooks');
});



app.get("/issueSuccess/:id", async (req, res) => {
    const book = await Book.findById(req.params.id);

    if (!book) {
        return res.send("Book not found");
    }

    res.render("studentBooks", {message:"Book Issue SucessFully - Thank You!!" });
});




app.get('/issuedBooks', async (req, res) => {

    let books = await Issue.find();

    res.render('issuedBooks', { books });

});



  app.get('/return-book/:id', isLoggedIn, async (req, res) => {

    try {

        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.render("IssueNotFound");
        }

        const today = new Date();
        let fine = 0;

        if (today > issue.returnDate) {
            const lateDays = Math.ceil(
                (today - issue.returnDate) / (1000 * 60 * 60 * 24)
            );

            fine = lateDays * 5;
        }

        // Book quantity increase
        const book = await Book.findById(issue.bookId);

        if (book) {
            book.quantity += 1;
            await book.save();
        }

        // Update History
        await History.findOneAndUpdate(
            {
                bookId: issue.bookId,
                studentEmail: issue.studentEmail,
                status: "Issued"
            },
            {
                status: "Returned",
                returnDate: today,
                fine: fine
            }
        );

        // Delete from current issued books
        await Issue.findByIdAndDelete(issue._id);

        res.render("bookReturn", { fine });

    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }

});


app.get('/logout', (req, res) => {

    req.session.destroy(() => {
        res.redirect('/login');
    });

});

app.listen(3000, () => {
    console.log('Server Running On http://localhost:3000');
});