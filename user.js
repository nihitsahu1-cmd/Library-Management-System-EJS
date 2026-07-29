const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    email: {
        type: String,
        unique: true
    },
    role: {
        type: String,
        default: "student"
    },
    photo:String

});

module.exports = mongoose.model('User', userSchema);