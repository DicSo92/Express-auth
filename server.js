const express = require('express')
const app = express()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const mongoose = require('mongoose')
// ---------------------------------------------------------------------------------------------------------------------
require('dotenv').config()
const {SESSION_SECRET, DB_USER_NAME, DB_USER_PASSWORD, DB_FILE_PATH} = process.env
// ---------------------------------------------------------------------------------------------------------------------
const passport = require('passport')
const session = require('express-session')
const LocalStrategy = require('passport-local').Strategy
// ---------------------------------------------------------------------------------------------------------------------
const User = require('./models/User')
const UserTemporary = require('./models/UserTemporary')
const ResetPassword = require('./models/ResetPassword')
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
passport.serializeUser((user, done) => done(null, user) )
passport.deserializeUser((user, done) => done(null, user) )
// ---------------------------------------------------------------------------------------------------------------------
passport.use(new LocalStrategy({usernameField: 'name'}, (username, password, done) => {
    User.findOne({ name: username }, (err, user) => {
        if (err) return done(err)
        if (!user) {
            return done(null, false, {
                message: 'User not found'
            })
        }
        if (!user.validPassword(password)) {
            return done(null, false, {
                message: 'Password is wrong'
            })
        }
        return done(null, user)
    })
}))
// ---------------------------------------------------------------------------------------------------------------------
// -- Routes -----------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.get('/signin', (req, res) => {
    res.render('signin.pug')
})
app.get('/signup', (req, res) => {
    res.render('signup.pug')
})
app.get('/signout', (req, res) => {
    req.logout();
    res.redirect('/signin');
})
app.get('/confirm', (req, res) => {
    res.render('confirmRegister.pug', {
        token: req.query.token
    })
})
app.get('/forgotPassword', (req, res) => {
    res.render('forgotPassword.pug')
})
app.get('/resetPassword', (req, res) => {
    res.render('resetPassword.pug', {
        token: req.query.token
    })
})
// ---------------------------------------------------------------------------------------------------------------------
// -- Requests ---------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
// app.post('/signin', urlencodedParser, passport.authenticate('local', {
//     successRedirect: '/user',
//     failureRedirect: '/signin'
// }))
app.post('/signin', urlencodedParser, function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        if (! user) {
            // return res.send(401,{ success : false, message : 'authentication failed' });
            return res.render('messageConfirm.pug', {
                positive: false,
                message: 'Authentication failed'
            })
        }
        req.login(user, function(err){
            if(err){
                return next(err);
            }
            // return res.send({ success : true, message : 'authentication succeeded' });
            if (user.role) { //If Admin
                return res.redirect('/user')
            } else {
                return res.redirect(`/user/${user._id}`)
            }
        });
    })(req, res, next);
});

app.post('/signup', urlencodedParser, async (req, res) => {
    const { name, password, email } = req.body
    const token = generate_token(25)

    const newUserTemporary = new UserTemporary({ name, password, email, token})
    try {
        const existingUser = await User.findOne({ name })
        if (existingUser) {
            // return res.status(400).send(`Le nom ${existingUser.name} est déjà utilisé`)
            return res.render('messageConfirm.pug', {
                positive: false,
                message: `Le nom ${existingUser.name} est déjà utilisé`
            })
        }
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
    try {
        const savedUserTemporary = await newUserTemporary.save()
        // res.status(201).send(`${savedUserTemporary.name} Un email de confirmation vous a été envoyé à l'adresse suivante : ${savedUserTemporary.email} !`)
        res.render('messageConfirm.pug', {
            positive: true,
            message: `${savedUserTemporary.name} Un email de confirmation vous a été envoyé à l'adresse suivante : ${savedUserTemporary.email} !`
        })

        sendEmail(name, email, token, 'confirmSignUp').catch(console.error);
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})

app.get('/confirm/:token', urlencodedParser, async (req, res) => {
    const { token } = req.params

    try {
        const existingUserTemporary = await UserTemporary.findOne({ token })
        if (existingUserTemporary) {
            const name = existingUserTemporary.name
            const email = existingUserTemporary.email
            const password = existingUserTemporary.password
            const newUser = new User({ name, email, password })
            try {
                const existingUser = await User.findOne({ name })
                if (existingUser) {
                    // return res.status(400).send(`Le nom ${existingUser.name} est déjà utilisé`)
                    return res.render('messageConfirm.pug', {
                        positive: false,
                        message: `Le nom ${existingUser.name} est déjà utilisé`
                    })
                }
            } catch (err) {
                return res.status(500).send('Erreur du serveur #1')
            }
            try {
                const savedUser = await newUser.save()
                // res.status(201).send(`${savedUser.name} enregistré avec succès avec l’ID ${savedUser._id} !`)

                existingUserTemporary.delete() // Delete temporary User without try/catch, not necessary for now
                res.render('messageConfirm.pug', {
                    positive: true,
                    message: `'${savedUser.name}' enregistré avec succès !`
                })
            } catch (err) {
                return res.status(500).send('Erreur du serveur #2')
            }
        } else {
            // return res.status(400).send(`Le token ${existingUserTemporary.token} n'existe pas`)
            return res.render('messageConfirm.pug', {
                positive: false,
                message: `Le token ${existingUserTemporary.token} n'existe pas`
            })
        }
    } catch (err) {
        return res.status(500).send('Erreur du serveur #3')
    }
})

app.post('/forgotPassword/send', urlencodedParser, async (req, res) => {
    const { name } = req.body
    const token = generate_token(25)

    try {
        const userToReset = await User.findOne({ name })
        if (userToReset) {
            const user_id = userToReset._id
            const resetPasswordTemporary = new ResetPassword({ user_id, name, token})
            const savedUserTemporary = await resetPasswordTemporary.save()
            const email = userToReset.email
            // res.status(201).send(`${savedUserTemporary.name} : Un email pour reinitialiser votre mot de passe vous a été envoyé !`)
            res.render('messageConfirm.pug', {
                positive: true,
                message: `${savedUserTemporary.name} : Un email pour reinitialiser votre mot de passe vous a été envoyé !`
            })

            sendEmail(name, email, token, 'resetPassword').catch(console.error);
        } else {
            // return res.status(400).send(`Le compte ${name} n'existe pas`)
            return res.render('messageConfirm.pug', {
                positive: false,
                message: `Le compte ${name} n'existe pas`
            })
        }
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})
app.post('/resetPassword/:token', urlencodedParser, async (req, res) => {
    const { token } = req.params
    const { password } = req.body

    try {
        const existingResetPasswordTemporary = await ResetPassword.findOne({ token })
        if (existingResetPasswordTemporary) {
            const _id = existingResetPasswordTemporary.user_id
            try {
                const user = await User.findByIdAndUpdate(_id, { $set: { password } }, { new: true })
                if (!user) {
                    return res.status(404).send(`Il n’y a pas d’utilisateur ${_id}`)
                }
                // return res.send(`Mot de passe de l'utilisateur ${existingResetPasswordTemporary.name} modifié !`)
                res.render('messageConfirm.pug', {
                    positive: true,
                    message: `Mot de passe modifié avec succès !`
                })
            } catch (err) {
                return res.status(500).send('Erreur du serveur')
            }
        } else {
            // return res.status(400).send(`Le token ${existingUserTemporary.token} n'existe pas`)
            return res.render('messageConfirm.pug', {
                positive: false,
                message: `Le token ${existingUserTemporary.token} n'existe pas`
            })
        }
    } catch (err) {
        return res.status(500).send('Erreur du serveur #3')
    }
})

app.get('/user', async (req, res) => {
    if (!req.user) return res.redirect('/signin')
    if (!req.user.role) return res.redirect(`/user/${req.user._id}`) //If !Admin (user)
    try {
        const users = await User.find({}).select('_id name role email')
        res.render('users.pug', {
            users: users
        })
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})
app.get('/user/:_id', async (req, res) => {
    const { _id } = req.params
    if (!req.user.role && req.user._id !== _id) return res.redirect(`/user/${req.user._id}`) //If !Admin (user)
    try {
        const user = await User.findById(_id).select('_id name email createdAt')
        if (!user) {
            return res.render('messageConfirm.pug', {
                positive: false,
                message: `Cet utilisateur n'existe pas`
            })
        }
        res.render('user.pug', {
            user: user
        })
    } catch (err) {
        console.log(err)
        return res.status(500).send('Erreur du serveur')
    }
})
app.post('/user/delete/:_id', async (req, res) => {
    const { _id } = req.params
    try {
        const user = await User.findByIdAndDelete(_id)
        if (!user) {
            return res.status(404).send(`Il n’y a pas d’utilisateur ${_id}`)
        }
        // return res.send(`L’utilisateur ${user._id} a bien été supprimé`)
        res.redirect('/user');
    } catch (err) {
        return res.status(500).send('Erreur du serveur')
    }
})
// ---------------------------------------------------------------------------------------------------------------------
app.get('*', (req, res) => {
    // res.status(404).send('Cette page n’existe pas !')
    res.redirect('/signin');
})
// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// ---- Utils Functions ------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
"use strict";
const nodemailer = require("nodemailer");

async function sendEmail(name, email, token, mode) {
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
    let mailOptions
    if (mode === 'confirmSignUp') {
        mailOptions = {
            from: '"Express_Auth 👻" <express_auth@express.com>', // sender address
            to: email, // list of receivers
            subject: `Hello ${name} ✔`, // Subject line
            text: "Confirmation d'inscription", // plain text body
            html: `<h1>Thank you for registration</h1>
                <b>Please Confirm signup :</b> 
                <p>Link : <a href='http://localhost:3000/confirm?token=${token}' target="_blank">http://localhost:3000/confirm?token=${token}</a></p>` // html body
        };
    } else if (mode === 'resetPassword') {
        mailOptions = {
            from: '"Express_Auth 👻" <express_auth@express.com>', // sender address
            to: email, // list of receivers
            subject: `Hello ${name} ✔`, // Subject line
            text: "Did you forgot your password ?", // plain text body
            html: `<h1>Did you forgot your password ?</h1>
                <b>Click on the link to reset your password :</b> 
                <p>Link : <a href='http://localhost:3000/resetPassword?token=${token}' target="_blank">http://localhost:3000/resetPassword?token=${token}</a></p>` // html body
        };
    }

    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    console.log("Message sent: %s", info.messageId);
}
function generate_token(length){
    let a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    let b = [];
    for (let i=0; i<length; i++) {
        let j = (Math.random() * (a.length-1)).toFixed(0);
        b[i] = a[j];
    }
    return b.join("");
}

// ---------------------------------------------------------------------------------------------------------------------
// -- Serveur ----------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.listen(3000, () => console.log('SERVEUR LANCÉ SUR LE PORT 3000'))
