const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({

    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book"
    },

    title: String,
    author: String,

    studentName: String,
    studentEmail: String,

    issueDate: {
        type: Date,
        default: Date.now
    },

    returnDate: Date,

    fine: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ["Issued", "Returned"],
        default: "Issued"
    }

});

module.exports = mongoose.model("History", historySchema);