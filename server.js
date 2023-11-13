const { login, signup, confirmEmail } = require('./email')
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb+srv://hung:pass@cluster0.dpxtjwe.mongodb.net/?retryWrites=true&w=majority';
// const client = new MongoClient(url);
// client.connect();

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => 
{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

app.post('/api/login', login);
app.post('/api/register', signup);
app.get('/confirmation/:email/:token', confirmEmail)
// app.post('/api/resendLink', signup);


app.listen(9000, () => {
    console.log('Server listening on port ' + 9000);
}); // start Node + Express server on port 9000