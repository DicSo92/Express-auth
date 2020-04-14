const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
}, { collection: 'users' })

userSchema.methods.validPassword = function(password) {
    return this.password === password
}

const User = mongoose.model('User', userSchema)
module.exports = User
