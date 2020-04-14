const mongoose = require('mongoose')
const Schema = mongoose.Schema

const resetPasswordSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        expires: '1m',
        default: Date.now
    }
}, { collection: 'resetPassword' })

// resetPasswordSchema.methods.validPassword = function(password) {
//     return this.password === password
// }

const User = mongoose.model('ResetPassword', resetPasswordSchema)
module.exports = User
