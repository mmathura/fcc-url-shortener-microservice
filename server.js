'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');

const dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
var db;
mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true }, (err, client) => {
  if (err) {
    return console.log("Connection failed");
  }
  else {
    console.log("Connected to database");    
    db = client;
    // ... add server code here ...
  }
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// post new url to /api/shorturl/new
app.post('/api/shorturl/new', (req, res) => {
  var temp_url = req.body.url;
  // console.log('Url via Form: ' + temp_url);
  var original_url = temp_url.split('//', 2)[1];
  // console.log('Original Url: '  + original_url);
  // handle [url]/more/routes
  var host_url = original_url.split('/')[0];
  // console.log('Host Url: ' + host_url);
  // dns.lookup(host, cb) // cb - callback
  dns.lookup(host_url, (err) => {
    // {"error":"invalid URL"}
    if (err) return res.json({error:'invalid URL'}); 
    // check if original_url exists in db
    db.collection('short_urls').findOne({original_url: original_url}, function(err, data) {
      if (err) { 
        // console.log(err); 
        return res.json({error: err}); 
      }
      // console.log(data);
      if (data) {
        // console.log('Short Url: ' + data.short_url);
        return res.json({original_url: original_url, short_url: parseInt(data.short_url)}); 
      } else {
        // num records in db
        var next_value;
        db.collection('short_urls').countDocuments({}, (err, count) => {
          if (err) { 
            // console.log(err);
            return res.json({error: err}); 
          }
          // console.log('Count: ' + count);
          // increment next val
          next_value = count + 1;
          // console.log('Next Url: ' + next_value);
          // add original_url to database
          db.collection('short_urls').insertOne({original_url: original_url, short_url: next_value.toString()}, (err, data) => {
            if (err) { 
              // console.log(err);
              return res.json({error: err});
            }
            return res.json({original_url: original_url, short_url: next_value}); 
          });
        });
      }
    });
  }); 
});

// receive short url {"original_url":"www.google.com","short_url":1}
app.get('/api/shorturl/:short_url?', function(req, res) {
  // console.log(req.params);
  var short_url = req.params['short_url'];
  // console.log(short_url);
  if (!short_url) 
    res.redirect('/');
  else {
    // res.send('In shorturl');
    // reverse lookup
    db.collection('short_urls').findOne({short_url: short_url}, function(err, data) {
      if (err) { 
        console.log(err); 
        return res.json({error: err}); 
      }
      if (data) {
        var s_url = 'https://' + data.original_url.split('www.')[1];
        // console.log(s_url); 
        // res.send("In database");
        res.redirect(s_url);
      }
      else
        return res.json({error: "invalid URL"}); 
    }); 
  }
});

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});