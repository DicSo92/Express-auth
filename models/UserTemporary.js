const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userTemporarySchema = new Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    }
}, { collection: 'usersTemporary' })

userTemporarySchema.methods.validPassword = function(password) {
    return this.password === password
}

const UserTemporary = mongoose.model('UserTemporary', userTemporarySchema)
module.exports = UserTemporary
