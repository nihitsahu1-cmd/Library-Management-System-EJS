const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: String,
    author: String,
    quantity: Number,
    photo:String
});

module.exports = mongoose.model('Book', bookSchema);