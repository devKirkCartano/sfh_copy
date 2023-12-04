const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const QRCode = require('qrcode');
const mysql = require('mysql2/promise'); // Make sure to install this library using npm or yarn
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const passwordValidator = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// Middleware setup
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('./public'));
app.set('view engine', 'ejs');
const sessionSecret = process.env.SESSION_SECRET || 'your-default-session-secret';
app.use(session({ secret: sessionSecret, resave: true, saveUninitialized: true }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());

// Database connection setup
const userPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function connectToUserDatabase() {
  try {
    const connection = await userPool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error connecting to the user database:', error.message);
    if (connection) {
      connection.release();
    }
    throw error;
  }
}

// Passport configuration
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    let connectionUserPassport;
    try {
      connectionUserPassport = await userPool.getConnection();
      const [rows] = await connectionUserPassport.execute('SELECT * FROM users WHERE email = ?', [email]);
      const user = rows[0];

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    } finally{
      if(connectionUserPassport){
        connectionUserPassport.release();
      }
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  let connectionUserDeserialize;

  try {
    connectionUserDeserialize = await userPool.getConnection();
    const [rows] = await connectionUserDeserialize.execute('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];

    if (!user) {
      return done(new Error('User not found'));
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  } finally {
    if (connectionUserDeserialize) {
      connectionUserDeserialize.release();
    }
  }
});


function checkAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login');
};

function checkNotAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return res.redirect('/');
  }
  next();
};

function preventCaching(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

// Routes

// Home page route
app.get('/', checkAuthenticated, preventCaching, async (req, res) => {
  try {
    // Assuming the user is logged in, retrieve the user from the database
    const user = req.user;

    if (!user) {
      // Redirect to the login page if the user is not logged in
      return res.redirect('/login');
    }

    // Render the main page that includes the user's QR code
    res.render("index.ejs", { user, qrCodePath: user.qrCodePath });
  } catch (error) {
    console.error('Error retrieving user:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Login page route
app.get('/login', checkNotAuthenticated, preventCaching, (req, res) => {
  res.render("login.ejs", { message: req.flash('error') });
});

// Register page route
app.get('/register', checkNotAuthenticated , preventCaching, (req, res) => {
  res.render("register.ejs", { error: req.flash('error'), success: req.flash('success') });
});

// Login endpoint
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true,
}));

// Registration endpoint
app.post('/register', checkNotAuthenticated, preventCaching, async (req, res) => {
  let connectionUserRegister;

  try {
    const { firstName, lastName, email, password, re_pass, membershipType } = req.body;

    if (password !== re_pass) {
      req.flash('error', 'Password and confirmation do not match');
      return res.redirect('/register');
    }

    if (!passwordValidator.test(password)) {
      req.flash('error', 'Password must have a minimum of 8 characters, at least one capital letter, one number, and one special character');
      return res.redirect('/register');
    }

    connectionUserRegister = await userPool.getConnection();

    const [existingUserRows] = await connectionUserRegister.execute('SELECT * FROM users WHERE email = ?', [email]);
    const existingUser = existingUserRows[0];
    
    if (existingUser) {
      req.flash('error', 'User with this email already exists');
      return res.redirect('/register');
    }

    // Generate QR code for the user
    const userIdentifier = `${encodeURIComponent(firstName + lastName)}`.replace(/%20/g, '-');
    const qrData = JSON.stringify({
      "UserID": userIdentifier,
      "firstName": `${firstName}`,
      "lastName": `${lastName}`,
      "Email": email,
    });

    // Full path for creating QR code
    const qrCodeFullPath = `./public/qrcodes/${userIdentifier}.png`;
    await QRCode.toFile(qrCodeFullPath, qrData);

    // Path for referencing in index.ejs
    const qrCodePathForIndex = `/qrcodes/${userIdentifier}.png`;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user in the database
    const [result] = await connectionUserRegister.execute('INSERT INTO users (firstName, lastName, email, password, qrCodePath, membershipType) VALUES (?, ?, ?, ?, ?, ?)', [firstName, lastName, email, hashedPassword, qrCodePathForIndex, membershipType]);

    // Assuming you want to display a success message
    req.flash('success', 'User registered successfully');

    // Link subscriptions to the user based on the email
    await connectionUserRegister.execute('UPDATE subscribed_members SET userId = ? WHERE email = ? AND userId IS NULL', [result.insertId, email]);

    return res.redirect('/register');
  } catch (error) {
    console.error('Error registering user:', error.message);

    // Assuming you want to display an error message for internal server errors
    req.flash('error', 'Internal Server Error');

    res.status(500).send('Internal Server Error');
  } finally {
    if (connectionUserRegister) {
      connectionUserRegister.release();
    }
  }
});



app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err.message);
    }
    res.redirect('/login');
  });
});

app.get('/get_announcements', async (req, res) => {
  let connectionGetAnnouncements;
  try {
      connectionGetAnnouncements = await userPool.getConnection();
      const [announcements] = await connectionGetAnnouncements.query('SELECT * FROM announcements');
      res.json(announcements);
  } catch (error) {
      console.error('Error fetching announcements:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
  } finally {
      if (connectionGetAnnouncements) {
        connectionGetAnnouncements.release();
      }
  }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing server gracefully...');
  
  // Close the database connection pool
  await userPool.end();
  
  // Exit the process
  process.exit();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});