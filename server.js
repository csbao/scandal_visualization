const express = require('express');
const cors = require('cors');

var app = express();
app.use(cors()); // enable cors
app.use(express.static('.'))

app.listen(8080, function() {
  console.log("Server is running at localhost: 8080")
});
