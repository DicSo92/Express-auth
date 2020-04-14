const express = require('express')
const app = express()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const mongoose = require('mongoose')
require('dotenv').config()
// ---------------------------------------------------------------------------------------------------------------------
const passport = require('passport')
const session = require('express-session')
const LocalStrategy = require('passport-local').Strategy
// ---------------------------------------------------------------------------------------------------------------------
const User = require('./models/User')
const {SESSION_SECRET, DB_USER_NAME, DB_USER_PASSWORD, DB_FILE_PATH} = process.env
// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
mongoose.set('useFindAndModify', false)
mongoose.connect(`mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASSWORD}@${process.env.DB_FILE_PATH}?retryWrites=true&w=majority`, {useNewUrlParser: true, useUnifiedTopology: true})
const db = mongoose.connection
db.on('error', console.error.bind(console, 'ERROR: CANNOT CONNECT TO MONGO-DB'))
db.once('open', () => {
    console.log('SUCCESS: CONNECTED TO MONGO-DB')
})
// ---------------------------------------------------------------------------------------------------------------------
app.use(helmet())
app.set('views', './views')
app.set('view engine', 'pug')
app.use(express.static('public'))
// ---------------------------------------------------------------------------------------------------------------------
// -- Passport ---------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.use(session({ secret: process.env.SESSION_SECRET, resave: false,
    saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user)
})
// ---------------------------------------------------------------------------------------------------------------------
passport.use(new LocalStrategy({
        usernameField: 'name'
    },
    (username, password, done) => {
        User.findOne({ name: username }, (err, user) => {
            if (err) {
                return done(err)
            }
            // Return if user not found in database
            if (!user) {
                return done(null, false, {
                    message: 'User not found'
                })
            }
            // Return if password is wrong
            if (!user.validPassword(password)) {
                return done(null, false, {
                    message: 'Password is wrong'
                })
            }
            // If credentials are correct, return the user object
            return done(null, user)
        })
    }
))
// ---------------------------------------------------------------------------------------------------------------------
// -- Routes -----------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.get('/signin', (req, res) => {
    res.render('signin.pug')
})
app.get('/signup', (req, res) => {
    res.render('signup.pug')
})
// ---------------------------------------------------------------------------------------------------------------------
// -- Requests ---------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.post('/signup', urlencodedParser, async (req, res) => {
    const { name, password } = req.body
// ¡¡¡ VÉRIFIER L’EXISTENCE DE name ET DE password !!!
// ¡¡¡ VÉRIFIER LES FORMES DE name ET DE password !!!
    const newUserTemporary = new User({ name, password })
    try {
        const existingUser = await User.findOne({ name })
        if (existingUser) {
            return res.status(400).send(`Le nom ${existingUser.name} est déjà utilisé`)
        }
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
    try {
        const savedUser = await newUserTemporary.save()
        res.status(201).send(`${savedUser.name} enregistré avec succès avec l’ID ${savedUser._id} !`)

        sendConfirmEmail().catch(console.error);
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})

app.post('/confirm/:token', urlencodedParser, async (req, res) => {
    const { token } = req.params

    // ---------------------------

    const newUser = new User({ name, password })
    try {
        const existingUser = await User.findOne({ name })
        if (existingUser) {
            return res.status(400).send(`Le nom ${existingUser.name} est déjà utilisé`)
        }
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
    try {
        const savedUser = await newUser.save()
        res.status(201).send(`${savedUser.name} enregistré avec succès avec l’ID ${savedUser._id} !`)


    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})

app.post('/signin', urlencodedParser, passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/signin'
}))

app.get('/user', async (req, res) => {
    if (!req.user) return res.redirect('/signin')
    try {
        const users = await User.find({}).select('_id name')
        return res.send(users)
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})
app.get('/user/:_id', async (req, res) => {
    const { _id } = req.params
    try {
        const user = await User.findById(_id).select('_id name created')
        return res.send(user)
    } catch (err) {
        console.log(err)
        return res.status(500).send('Erreur du serveur')
    }
})
app.put('/user/:_id', urlencodedParser, async (req, res) => {
    const { _id } = req.params
    const { name, password } = req.body
    try {
        const user = await User.findByIdAndUpdate(_id, { $set: { name, password } }, { new: true })
        if (!user) {
            return res.status(404).send(`Il n’y a pas d’utilisateur ${_id}`)
        }
        return res.send(`Utilisateur ${user._id} modifié`)
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})
app.delete('/user/:_id', async (req, res) => {
    const { _id } = req.params
    try {
        const user = await User.findByIdAndDelete(_id)
        if (!user) {
            return res.status(404).send(`Il n’y a pas d’utilisateur ${_id}`)
        }
        return res.send(`L’utilisateur ${user._id} a bien été supprimé`)
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})
app.get('*', (req, res) => {
    res.status(404).send('Cette page n’existe pas !')
})


"use strict";
const nodemailer = require("nodemailer");

// async..await is not allowed in global scope, must use a wrapper
async function sendConfirmEmail() {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'test.mails.cl92@gmail.com', // generated ethereal user
            pass: '!Azerty92!' // generated ethereal password
        }
    });

    const mailOptions = {
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: "luzzi.charly@gmail.com", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: "<b>Hello world?</b>" // html body
    };

    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
}

// ---------------------------------------------------------------------------------------------------------------------
// -- Serveur ----------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.listen(3000, () => console.log('SERVEUR LANCÉ SUR LE PORT 3000'))
