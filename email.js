const Bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb+srv://API:WH33LD34L5@cluster0.afh9bua.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(url);
client.connect();

var userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  isVerified: { type: Boolean, default: false },
  password: String,
});

var tokenSchema = new mongoose.Schema({
  _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true },
  expireAt: { type: Date, default: Date.now, index: { expires: 86400000 } }
});

exports.login = async function (req, res, next) {
  var db = client.db("cop4331");

  try {
    const user = await db.collection("Users").findOne({ email: req.body.email })
    console.log(user)
    // user is not found in database i.e. user is not registered yet.
    if (!user) {
      return res.status(401).send({ msg: 'The email address ' + req.body.email + ' is not associated with any account. please check and try again!' });
    }
    // comapre user's password if user is find in above step
    else if (req.body.password != user.password) {
      return res.status(401).send({ msg: 'Wrong Password!' });
    }
    // check user is verified or not
    else if (!user.isVerified) {
      return res.status(401).send({ msg: 'Your Email has not been verified. Please click on resend' });
    }
    // user successfully logged in
    else {
      return res.status(200).send({ msg: 'User successfully logged in.' });
    }
  }
  catch (e) {
    return res.status(500).send({ msg: err.message });
  }
};

exports.signup = async function (req, res, next) {
  var db = client.db("cop4331");
  const { firstName, lastName, userName, email, password } = req.body;
  var Token = mongoose.model('Token', tokenSchema);

  try {
    var user = await db.collection("Users").findOne({ email: req.body.email })
    // error occur
    // if email is exist into database i.e. email is associated with another user.
    if (user) {
      return res.status(400).send({ msg: 'This email address is already associated with another account.' });
    }
    // if user is not exist into database then save the user into database for register account
    else {
      // password hashing for save into databse
      // create and save user
      await db.collection("Users").insertOne({
        firstName: firstName,
        lastName: lastName,
        email: email,
        userName: userName,
        password: password,
        carsArr: []
      });
      user = await db.collection("Users").findOne({ email: req.body.email })
      console.log(user)

      // generate token and save
      try {
        var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
      }
      catch (e) {
        return res.status(500).send({ msg: e });
      }

      // Send email (use verified sender's email address & generated API_KEY on SendGrid)
      const transporter = nodemailer.createTransport(
        sendgridTransport({
          auth: {
            api_key: "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",
          }
        })
      )
      var mailOptions = { from: 'thaihungtran57116@gmail.com', to: user.email, subject: 'Account Verification Link', text: 'Hello ' + req.body.firstName + ',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' };
      try {
        transporter.sendMail(mailOptions)
      }
      catch (e) {
        return res.status(500).send({ msg: 'Technical Issue!, Please click on resend for verify your Email.' });
      }
      return res.status(200).send({ msg: 'A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.' });
    }
  }
  catch (e) {
    return res.status(500).send({ msg: e });
  }

};

// TODO: get this to work
// It is GET method, you have to write like that
//    app.get('/confirmation/:email/:token',confirmEmail)

exports.confirmEmail = function (req, res, next) {
  Token.findOne({ token: req.params.token }, function (err, token) {
    // token is not found into database i.e. token may have expired 
    if (!token) {
      return res.status(400).send({ msg: 'Your verification link may have expired. Please click on resend for verify your Email.' });
    }
    // if token is found then check valid user 
    else {
      User.findOne({ _id: token._userId, email: req.params.email }, function (err, user) {
        // not valid user
        if (!user) {
          return res.status(401).send({ msg: 'We were unable to find a user for this verification. Please SignUp!' });
        }
        // user is already verified
        else if (user.isVerified) {
          return res.status(200).send({ msg: 'User has been already verified. Please Login' });
        }
        // verify user
        else {
          // change isVerified to true
          user.isVerified = true;
          user.save(function (err) {
            // error occur
            if (err) {
              return res.status(500).send({ msg: err.message });
            }
            // account successfully verified
            else {
              return res.status(200).send({ msg: 'Your account has been successfully verified' });
            }
          });
        }
      });
    }

  });
};

// TODO: Get this to work
exports.resendLink = function (req, res, next) {

  User.findOne({ email: req.body.email }, function (err, user) {
    // user is not found into database
    if (!user) {
      return res.status(400).send({ msg: 'We were unable to find a user with that email. Make sure your Email is correct!' });
    }
    // user has been already verified
    else if (user.isVerified) {
      return res.status(200).send('This account has been already verified. Please log in.');

    }
    // send verification link
    else {
      // generate token and save
      var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
      token.save(function (err) {
        if (err) {
          return res.status(500).send({ msg: err.message });
        }

        // Send email (use verified sender's email address & generated API_KEY on SendGrid)
        const transporter = nodemailer.createTransport(
          sendgridTransport({
            auth: {
              api_key: process.env.SENDGRID_APIKEY,
            }
          })
        )
        var mailOptions = { from: 'no-reply@example.com', to: user.email, subject: 'Account Verification Link', text: 'Hello ' + user.name + ',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' };
        transporter.sendMail(mailOptions, function (err) {
          if (err) {
            return res.status(500).send({ msg: 'Technical Issue!, Please click on resend for verify your Email.' });
          }
          return res.status(200).send('A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.');
        });
      });
    }
  });
};