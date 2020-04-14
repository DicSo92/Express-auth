const express = require('express')
const app = express()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const mongoose = require('mongoose')


mongoose.set('useFindAndModify', false)
mongoose.connect('mongodb+srv://dbAdmin:qfPHnZnPpNoCqnqU@first-project-yyhpz.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true})
const db = mongoose.connection
db.on('error', console.error.bind(console, 'ERROR: CANNOT CONNECT TO MONGO-DB'))
db.once('open', () => {
    console.log('SUCCESS: CONNECTED TO MONGO-DB')
})

app.use(helmet())
app.set('views', './views')
app.set('view engine', 'pug')
app.use(express.static('public'))



app.get('/signin', (req, res) => {
    res.render('signing.pug')
})
app.get('/signup', (req, res) => {
    res.render('signing.pug')
})

app.listen(3000, () => console.log('SERVEUR LANCÉ SUR LE PORT 3000'))
