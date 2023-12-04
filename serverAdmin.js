const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const QRCode = require('qrcode');
const mysql = require('mysql2/promise'); // Make sure to install this library using npm or yarn
const cron = require('node-cron');
const moment = require('moment');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT_ADMIN = process.env.PORT_ADMIN || 3001;
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
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function connectToDatabase() {
  let connection
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
    if (connection) {
      connection.release();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Passport configuration
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    let connectionPassport;
    try {
      connectionPassport = await pool.getConnection();
      const [rows] = await connectionPassport.execute('SELECT * FROM adminusers WHERE email = ?', [email]);
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
      if(connectionPassport){
        connectionPassport.release();
      }
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.name);
});

passport.deserializeUser(async (name, done) => {
  let connectionDeserialize;

  try {
    connectionDeserialize = await pool.getConnection();
    const [rows] = await connectionDeserialize.execute('SELECT * FROM adminusers WHERE name = ?', [name]);
    const user = rows[0];

    if (!user) {
      return done(new Error('User not found'));
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  } finally{
    if (connectionDeserialize){
      connectionDeserialize.release();
    }
  }
});

const pathPrefix = '/admin';

function checkAuthenticated(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect(`${pathPrefix}/login`);
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

/*cron.schedule('20 18 * * *', async () => {
  try {
    const connection = await pool.getConnection();

    // Delete records older than a day
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss');
    await connection.execute('DELETE FROM member_names WHERE timestamp < ?', [yesterday]);

    // Archive deleted records in a separate database table
    await connection.execute('INSERT INTO archived_member_names SELECT * FROM member_names WHERE timestamp < ?', [yesterday]);

    console.log('Cron job executed: Deleted and archived scanned names.');
  } catch (error) {
    console.error('Error during cron job:', error.message);
  } finally {
    connection.release(); // Release the connection back to the pool
  }
});*/


//Routes

app.get('/', checkAuthenticated, preventCaching, async (req, res) => {
  try {
    // Assuming the user is logged in, retrieve the user from the database
    const user = req.user;

    if (!user) {
      // Redirect to the login page if the user is not logged in
      return res.redirect(`${pathPrefix}/login`);
    }

    // Render the main page that includes the user's QR code
    res.render("index-admin.ejs", { user });
  } catch (error) {
    console.error('Error retrieving user:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Login page route
app.get(`${pathPrefix}/login`, checkNotAuthenticated, preventCaching, (req, res) => {
  res.render("login-admin.ejs", { message: req.flash('error') });
});

// Register page route
app.get(`${pathPrefix}/register`, checkNotAuthenticated, preventCaching, (req, res) => {
  res.render("register-admin.ejs", { error: req.flash('error'), success: req.flash('success') });
});

// Announcement page route
app.get(`${pathPrefix}/announcement-form`, checkAuthenticated, preventCaching, (req, res) => {
  res.render("announcement-admin.ejs", { error: req.flash('error'), success: req.flash('success') });
});

// Application form page route
app.get(`${pathPrefix}/application-form`, checkAuthenticated, preventCaching, (req, res) => {
  res.render("applicationForm-admin.ejs", { error: req.flash('error'), success: req.flash('success') });
});

// Application form page route
app.get(`${pathPrefix}/accounting`, checkAuthenticated, preventCaching, (req, res) => {
  res.render("accounting-admin.ejs", { error: req.flash('error'), success: req.flash('success') });
});

// Application form page route
app.get(`${pathPrefix}/scanner-page`, checkAuthenticated, preventCaching, (req, res) => {
  res.render("scanner-admin.ejs", { error: req.flash('error'), success: req.flash('success') });
});


// Login endpoint
app.post(`${pathPrefix}/login`, checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: `${pathPrefix}/login`,
    failureFlash: true,
  }));

// Registration endpoint
app.post(`${pathPrefix}/register`, checkNotAuthenticated, preventCaching, async (req, res) => {
  let connectionRegister;

    try {
      const { name, email, password, re_pass } = req.body;
  
      if (password !== re_pass) {
        req.flash('error', 'Password and confirmation do not match');
        return res.redirect(`${pathPrefix}/register`);
      }

      if (!passwordValidator.test(password)) {
        req.flash('error', 'Password must have a minimum of 8 characters, at least one capital letter, one number, and one special character');
        return res.redirect(`${pathPrefix}/register`);
      }

      connectionRegister = await pool.getConnection();

      const [existingNameRows] = await connectionRegister.execute('SELECT * FROM adminusers WHERE name = ?', [name]);
      const existingName = existingNameRows[0];
      if (existingName){
        req.flash('error', 'Username is already taken');
        return res.redirect(`${pathPrefix}/register`);
      }

      const [existingUserRows] = await connectionRegister.execute('SELECT * FROM adminusers WHERE email = ?', [email]);
      const existingUser = existingUserRows[0];
      if (existingUser) {
        req.flash('error', 'User with this email already exists');
        return res.redirect(`${pathPrefix}/register`);
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save the user in the database
      const [result] = await connectionRegister.execute('INSERT INTO adminusers (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

      // Assuming you want to display a success message
      req.flash('success', 'User registered successfully');
  
      return res.redirect(`${pathPrefix}/register`);
    } catch (error) {
      console.error('Error registering user:', error.message);
  
      // Assuming you want to display an error message for internal server errors
      req.flash('error', 'Internal Server Error');
  
      res.status(500).send('Internal Server Error');
    } finally {
      if (connectionRegister){
        connectionRegister.release();
      }
    }
  });

// Endpoint to get user information by ID
app.get('/getUserInfo/:id', checkAuthenticated, async (req, res) => {
  const userId = req.params.id;

  let connectionGetUserInfo;

  try {
    connectionGetUserInfo = await pool.getConnection();
    const [rows] = await connectionGetUserInfo.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const userData = rows[0];

    if (userData) {
      // Send the user data as a JSON response
      res.json(userData);
    } else {
      // User with the given ID not found
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user information:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connectionGetUserInfo) {
      connectionGetUserInfo.release();
    }
  }
});

//Endpoint to get all users
app.get('/getAllUsers', async (req, res) => {
  let connectionGetAllUsers;
  try {
    connectionGetAllUsers = await pool.getConnection();
    const query = `
      SELECT users.id, users.firstName, users.lastName, users.email,
             subscribed_members.userId AS subscribedUserId
      FROM users
      LEFT JOIN subscribed_members ON users.id = subscribed_members.userId
    `;
    const [users] = await connectionGetAllUsers.execute(query);
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connectionGetAllUsers) {
      connectionGetAllUsers.release();
    }
  }
});


// Add a new route to check if a user is already subscribed
app.get('/checkSubscription/:userId', async (req, res) => {
  let connectionCheckSubscription;
  try {
    connectionCheckSubscription = await pool.getConnection();
    const userId = req.params.userId;

    let query;
    let queryParams;

    if (userId === 'null') {
      // If userId is 'null', check by email
      const email = req.query.email; // Assuming the email is provided as a query parameter
      query = 'SELECT * FROM subscribed_members WHERE email = ? AND userId IS NULL';
      queryParams = [email];
    } else {
      // If userId is provided, check by userId
      query = 'SELECT * FROM subscribed_members WHERE userId = ?';
      queryParams = [userId];
    }

    // Perform a query to check if the user is already subscribed
    const [result] = await connectionCheckSubscription.execute(query, queryParams);

    if (result.length > 0) {
      // User is already subscribed
      res.json({ subscribed: true });
    } else {
      // User is not subscribed
      res.json({ subscribed: false });
    }
  } catch (error) {
    console.error('Error checking subscription:', error.message);
    res.json({ subscribed: false });
  } finally {
    if (connectionCheckSubscription) {
      connectionCheckSubscription.release();
    }
  }
});


// Add a new route for handling membership form submission
app.post('/submitMembership/:userId', async (req, res) => {
  let connectionSubmitMembership;

  try {
    const userId = req.params.userId;

    // Check if the user is already subscribed
    const subscriptionCheckResponse = await fetch(`${req.protocol}://${req.get('host')}/checkSubscription/${userId}`);
    
    if (!subscriptionCheckResponse.ok) {
      throw new Error(`Error checking subscription: ${subscriptionCheckResponse.statusText}`);
    }

    const { subscribed } = await subscriptionCheckResponse.json();

    if (subscribed) {
      console.log('User is already subscribed');
      res.json({ success: false, message: 'User is already subscribed' });
      return;
    }

    // If not subscribed, proceed with form submission
    const { firstName, lastName, membershipType, email, contactNumber } = req.body;
    console.log(req.body);
    // Perform a query to insert data into the subscribed-members table
    connectionSubmitMembership = await pool.getConnection();
    const [result] = await connectionSubmitMembership.execute(
      'INSERT INTO subscribed_members (userId, firstName, lastName, membershipType, email, contactNumber) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, firstName, lastName, membershipType, email, contactNumber]
    );

    if (result.affectedRows > 0) {
      console.log('Membership submitted successfully');
      res.json({ success: true });
    } else {
      console.error('Failed to submit membership');
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Error during membership submission:', error.message);
    res.json({ success: false });
  } finally {
    if (connectionSubmitMembership) {
      connectionSubmitMembership.release();
    }
  }
});



app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err.message);
    }
    res.redirect(`${pathPrefix}/login`);
  });
});

// /authenticate route
app.post('/authenticate', async (req, res) => {
  let connectionAuthenticate;

  try {
    const { firstName, lastName } = req.body;

    

    if (!firstName || !lastName) {
      console.error('Error: firstName or lastName is undefined or empty');
      res.json({ success: false });
      return;
    }

    connectionAuthenticate = await pool.getConnection();

    const query = 'SELECT * FROM subscribed_members WHERE firstName = ? AND lastName = ?';
    const queryParams = [firstName, lastName];

    const [rows] = await connectionAuthenticate.execute(query, queryParams);
    const user = rows[0];

    if (user) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Error during authentication:', error.message);
    res.json({ success: false });
  } finally {
    if (connectionAuthenticate){
      connectionAuthenticate.release();
    }
  }
});

// /record-member-name route
app.post('/record-member-name', async (req, res) => {
  let connectionRecordName;

  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      console.error('Error: firstName or lastName is undefined or empty');
      res.json({ success: false });
      return;
    }

    connectionRecordName = await pool.getConnection();

    // Include the current timestamp in the INSERT statement
    const timestamp = new Date(); // Current date and time
    const [insertResult] = await connectionRecordName.execute(
      'INSERT INTO member_names (firstName, lastName, timestamp) VALUES (?, ?, ?)',
      [firstName, lastName, timestamp]
    );

    // Retrieve all scanned names from the database
    const [selectResult] = await connectionRecordName.execute(
      'SELECT firstName, lastName, timestamp FROM member_names ORDER BY timestamp DESC'
    );
    const scannedNames = selectResult.map(row => ({
      firstName: row.firstName,
      lastName: row.lastName,
      timestamp: row.timestamp,
    }));

    if (insertResult.affectedRows > 0) {
      console.log('Scanned name recorded successfully');
      // Include the timestamp in the response
      res.json({ success: true, scannedNames, timestamp });
    } else {
      console.error('Failed to record scanned name');
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Error recording scanned name:', error.message);
    res.json({ success: false });
  } finally {
    if (connectionRecordName) {
      connectionRecordName.release();
    }
  }
});

app.post('/createUser', async (req, res) => {
  let connectionCreateUser;
  try {
      const { firstName, lastName, email, contactNumber, membershipType } = req.body;
      // Check if the user is already subscribed
      const subscriptionCheck = await checkSubscriptionByEmail(email);

      if (subscriptionCheck.subscribed) {
          // User is already subscribed
          req.flash('error', 'User is already subscribed');
          res.redirect('/admin/application-form'); // Redirect to your desired page
          return;
      }
      // Insert data into subscribed_members
      connectionCreateUser = await pool.getConnection();
      const [result] = await pool.execute('INSERT INTO subscribed_members (firstName, lastName, email, contactNumber, membershipType) VALUES (?, ?, ?, ?, ?)', [firstName, lastName, email, contactNumber, membershipType]);
      if (result.affectedRows > 0) {
          req.flash('success', 'User subscribed successfully');
          res.redirect('/admin/application-form'); // Redirect to your desired page
      } else {
          req.flash('error', 'Failed to insert data into subscribed_members');
          res.redirect('/admin/application-form'); // Redirect to your desired page
      }
  } catch (error) {
      console.error('Error creating user:', error.message);
      req.flash('error', 'Internal server error');
      res.redirect('/admin/application-form'); // Redirect to your desired page
  } finally {
      if (connectionCreateUser) {
          connectionCreateUser.release();
      }
  }
});


async function checkSubscriptionByEmail(email) {
  let connectionCheckSubscription;
  try {
      connectionCheckSubscription = await pool.getConnection();
      // Perform a query to check if the user is already subscribed
      const [result] = await connectionCheckSubscription.execute('SELECT * FROM subscribed_members WHERE email = ?', [email]);

      if (result.length > 0) {
          // User is already subscribed
          return { subscribed: true };
      } else {
          // User is not subscribed
          return { subscribed: false };
      }
  } catch (error) {
      console.error('Error checking subscription:', error.message);
      return { subscribed: false };
  } finally {
      if (connectionCheckSubscription) {
          connectionCheckSubscription.release();
      }
  }
}



app.get('/get_announcements', async (req, res) => {
  let connectionGetAnnouncements;
  try {
      connectionGetAnnouncements = await pool.getConnection();
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

// Submission of announcements
app.post('/submit_announcement', async (req, res) => {
  let connectionSubmitAnnouncement;
  try {
    connectionSubmitAnnouncement = await pool.getConnection();
    const { category, title, content } = req.body;

    

    const result = await connectionSubmitAnnouncement.execute(
      'INSERT INTO announcements (category, title, content) VALUES (?, ?, ?)',
      [category, title, content]
    );
    

    if (result[0].affectedRows > 0) {
      //announcement submitted successfully
      console.log('Announcement submitted successfully');
      res.json({ success: true });
    } else {
      //announcement submission failed
      console.log('Failed to save announcement to the database. No rows affected.');
      res.status(500).json({ error: 'Failed to save announcement' });
    }
  } catch (error) {
    console.error('Error submitting announcement:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connectionSubmitAnnouncement){
      connectionSubmitAnnouncement.release();
    }
  }
});

// Editing an announcement
app.put('/edit_announcement/:id', async (req, res) => {
  const announcementId = req.params.id;
  const { category, title, content } = req.body;
  
  let connectionEditAnnouncement;

  try {
    connectionEditAnnouncement = await pool.getConnection();
    const result = await connectionEditAnnouncement.execute(
      'UPDATE announcements SET category = ?, title = ?, content = ? WHERE id = ?',
      [category, title, content, announcementId]
    );

    if (result.affectedRows > 0) {
      // Announcement edited successfully
      res.json({ success: true, message: 'Announcement edited successfully' });
    } else {
      // Announcement with the given ID not found
      res.status(404).json({ error: 'Announcement not found' });
    }
  } catch (error) {
    console.error('Error editing announcement:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connectionEditAnnouncement){
      connectionEditAnnouncement.release();
    }
  }
});

// Deleting an announcement
app.delete('/delete_announcement/:id', async (req, res) => {
  const announcementId = req.params.id;

  let connectionDeleteAnnouncement;

  try {
    connectionDeleteAnnouncement = await pool.getConnection();
    const result = await connectionDeleteAnnouncement.execute(
      'DELETE FROM announcements WHERE id = ?',
      [announcementId]
    );

    if (result.affectedRows > 0) {
      // Announcement deleted successfully
      res.json({ success: true, message: 'Announcement deleted successfully' });
    } else {
      // Announcement with the given ID not found
      res.status(404).json({ error: 'Announcement not found' });
    }
  } catch (error) {
    console.error('Error deleting announcement:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally { 
    if (connectionDeleteAnnouncement){
      connectionDeleteAnnouncement.release();
    }
  }
});

app.get('/getScannedNames', async (req, res) => {
  let connectionScannedNames;
  try {
    connectionScannedNames = await pool.getConnection();
    const [selectResult] = await connectionScannedNames.execute('SELECT firstName, lastName, timestamp FROM member_names ORDER BY timestamp DESC');
    const scannedNames = selectResult.map(row => ({
      firstName: row.firstName,
      lastName: row.lastName,
      timestamp: row.timestamp,
    }));
    res.json(scannedNames);
  } catch (error) {
    console.error('Error retrieving scanned names:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (connectionScannedNames){
      connectionScannedNames.release();
    }
  }
});

// Endpoint to get monthly transactions
app.get('/getMonthlyTransactions', async (req, res) => {
  let connectionGetMonthlyTransactions;
  try {
    connectionGetMonthlyTransactions = await pool.getConnection();
    const [monthlyData] = await connectionGetMonthlyTransactions.execute('SELECT * FROM monthly_transactions');
    res.json({ monthlyData });
  } catch (error) {
    console.error('Error getting monthly transactions:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    if (connectionGetMonthlyTransactions){
      connectionGetMonthlyTransactions.release();
    }
  }
});

app.post('/saveMonthlyTransactions', async (req, res) => {
  let connectionSaveMonthlyTransactions;

  try {
    const { monthlyData: newMonthlyData } = req.body;

    connectionSaveMonthlyTransactions = await pool.getConnection();
    await connectionSaveMonthlyTransactions.beginTransaction();

    // Use a loop to process each monthly data
    for (const data of newMonthlyData) {
      const {
        month,
        waterBill,
        electricBill,
        drinkableWaterBill,
        productSales,
        subscription,
        walkIn,
        monthlyExpense,
        monthlyIncome,
      } = data;

      try {
        // Check if the record already exists for the given month
        const [existingRows] = await connectionSaveMonthlyTransactions.execute(
          'SELECT * FROM monthly_transactions WHERE month = ?',
          [month]
        );

        if (existingRows.length > 0) {
          // Update the existing record
          const [updateResult] = await connectionSaveMonthlyTransactions.execute(
            'UPDATE monthly_transactions SET waterBill=?, electricBill=?, drinkableWaterBill=?, productSales=?, subscription=?, walkIn=?, monthlyExpense=?, monthlyIncome=? WHERE month=?',
            [
              waterBill,
              electricBill,
              drinkableWaterBill,
              productSales,
              subscription,
              walkIn,
              monthlyExpense,
              monthlyIncome,
              month,
            ]
          );

          if (updateResult.affectedRows > 0) {
            console.log(`Monthly transactions for ${month} updated successfully`);
          } else {
            console.error(`Failed to update monthly transactions for ${month}`);
          }
        } else {
          // Insert a new record
          const [insertResult] = await connectionSaveMonthlyTransactions.execute(
            'INSERT INTO monthly_transactions (month, waterBill, electricBill, drinkableWaterBill, productSales, subscription, walkIn, monthlyExpense, monthlyIncome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              month,
              waterBill,
              electricBill,
              drinkableWaterBill,
              productSales,
              subscription,
              walkIn,
              monthlyExpense,
              monthlyIncome,
            ]
          );

          if (insertResult.affectedRows > 0) {
            console.log(`Monthly transactions for ${month} inserted successfully`);
          } else {
            console.error(`Failed to insert monthly transactions for ${month}`);
          }
        }
      } catch (error) {
        console.error(`Error processing data for month ${month}: ${error.message}`);
        throw error; // Re-throw the error to trigger a rollback
      }
    }

    // Commit the transaction if all data is processed successfully
    await connectionSaveMonthlyTransactions.commit();

    // Update the server data after successful transaction
    monthlyData = newMonthlyData;

    res.json({ success: true, message: 'Monthly transactions saved successfully' });
  } catch (error) {
    console.error('Error saving monthly transactions:', error.message);

    // Rollback the transaction on error
    if (connectionSaveMonthlyTransactions) {
      await connectionSaveMonthlyTransactions.rollback();
    }

    res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
    if (connectionSaveMonthlyTransactions) {
      connectionSaveMonthlyTransactions.release();
    }
  }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing server gracefully...');
  
  // Close the database connection pool
  await pool.end();
  
  // Exit the process
  process.exit();
});

// Start the server
app.listen(PORT_ADMIN, () => {
  console.log(`Server is running on port ${PORT_ADMIN}`);
});