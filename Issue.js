const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
    studentName: String,
    studentEmail:String,
    bookId: String,
    bookTitle: String,
    issueDate: Date,
    returnDate: Date,
    returned: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Issue', issueSchema);