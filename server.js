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


// ---------------------------------------------------------------------------------------------------------------------
// -- Serveur ----------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
app.listen(3000, () => console.log('SERVEUR LANCÉ SUR LE PORT 3000'))
