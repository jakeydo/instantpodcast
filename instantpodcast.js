#!/usr/bin/env node
var request = require("request");
var fs = require("fs");
var async = require("async");
var rss = require("rss");
var nodemailer = require("nodemailer");
var progress = require("progress-stream");


var authToken = ""; //add your generated auth token from dropbox here
var gmailUsername = ""; //add your gmail username here
var gmailPassword = ""; //add your gmail password here
var emailToSendTo = ""; //add the email address you want to send the link to


var authHeader = {"Authorization":"Bearer " + authToken};
var accountInfoURL = "https://api.dropbox.com/1/account/info";
var metadataURL = "https://api.dropbox.com/1/metadata/auto/";
var uploadURL = "https://api-content.dropbox.com/1/files_put/auto/";
var shareURL = "https://api.dropbox.com/1/shares/auto/";

var options = {headers:authHeader};
var dbRequest = request.defaults(options);


fs.readdir('.', function(err, files){
  console.log(files);
  var fileCount = files.length;
  var mp3s = [];
  var art = "";
  for(var i = 0; i<fileCount; i++) {
    if(files[i].indexOf('.mp3') > -1) {
      mp3s.push(files[i]);
    }
    else if (files[i].indexOf('.jpg') > -1) {
      art = files[i];
    }
  }
  console.log("MP3 FILES");
  console.log(mp3s);
  console.log("art");
  console.log(art);

  var splitArtName = art.split('.');
  var bookName = splitArtName[0];
  var mp3ShareURLs = [];
  var artShareURL = [];

  async.forEachOf(mp3s, uploadFileAndShare.bind(null,  mp3ShareURLs, bookName), function(err){
    console.log('done uploading?');
    uploadFileAndShare(artShareURL,bookName,art,0,function(error){
      // console.log("mp3 urls");
      // console.log(mp3ShareURLs);
      // console.log("art urls");
      // console.log(artShareURL);

      buildAndUploadRSSFeed(mp3ShareURLs, artShareURL, bookName, function(){
        console.log("done with everything?");
      });

    });
  });

})

function uploadFileAndShare(shareURLArray, folder, file, key, callback) {
  console.log("uploading " +file);
  var finalUploadURL = encodeURI(uploadURL + folder + "/" + file);
  var finalShareURL = encodeURI(shareURL + folder + "/" + file);
  var fileStream = fs.createReadStream(file);
  var upStream = dbRequest.put(finalUploadURL);

  var stat = fs.statSync(file);
  var str = progress({length:stat.size, time:2000});
  str.on('progress', function(progress){
    console.log(file + " upload: " + progress.percentage + "%");
  });

  fileStream.pipe(str).pipe(upStream);
  upStream.on('end', function(){
    console.log("filestream closed for " + file);

    var response = "";
    dbRequest.post(finalShareURL+"?short_url=false").on('data', function(chunk){
      response = response + chunk;
    }).on('end', function(){
      // console.log("final response: " +response);
      var body = JSON.parse(response);
      var shareURL = body.url;
      console.log(file + " share url: " + shareURL);
      //change from preview url to actual file url
      shareURL = shareURL.replace("www.dropbox.com", "dl.dropboxusercontent.com");
      shareURLArray[key] = shareURL.replace("?dl=0", "");
      callback();
    });
  });
}

function buildAndUploadRSSFeed(mp3URLSs, artURL, bookName, callback){
  fs.writeFile("feed.xml", "placeholder", function(err) {
    var feedUploadURL = encodeURI(uploadURL + bookName + "/feed.xml");
    var firstFileStream = fs.createReadStream("feed.xml");
    var upStream = dbRequest.put(feedUploadURL);
    firstFileStream.pipe(upStream);
    upStream.on('end', function(err){
      console.log("filestream closed for " + "feed.xml");
      var finalShareURL = encodeURI(shareURL + bookName + "/feed.xml");
      var response = "";
      dbRequest.post(finalShareURL+"?short_url=false").on('data', function(chunk){
        response = response + chunk;
        console.log("chunk is: " + chunk);
      }).on('end', function(){
        var body = JSON.parse(response);
        var shareURL = body.url;
        shareURL = shareURL.replace("www.dropbox.com", "dl.dropboxusercontent.com");
        shareURL = shareURL.replace("?dl=0", "");
        console.log("feed share url: " + shareURL);

        var custom_namespaces = {'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'};
        var feedOptions = {custom_namespaces:custom_namespaces, title:bookName, feed_url:shareURL, site_url:"http://google.com", image_url:artURL};
        var feed = new rss(feedOptions);
        var numberOfMP3s = mp3URLSs.length;

        for(var i=0; i< numberOfMP3s; i++) {
          var bumpedi = i+1;
          var titleString = bookName + " " + bumpedi + " of " + numberOfMP3s;
          var description = titleString
          var guid = titleString.replace(/\s/g, "");
          var today = new Date();
          today.setDate(today.getDate() - i);
          var thisDate = today.toString();
          var itunes_elements = [{'itunes:subtitle':titleString}, {'itunes:image':{_attr:{href:artURL}}}];
          var itemOptions = {title:titleString, description:description, guid:guid, url:mp3URLSs[i], enclosure:{url:mp3URLSs[i]}, date:thisDate, custom_elements:itunes_elements};
          feed.item(itemOptions);
        }
        var xml = feed.xml({indent: true});
        console.log(xml);

        fs.writeFile("feed.xml", xml, function(err){
          var secondFileStream = fs.createReadStream("feed.xml");
          secondFileStream.pipe(dbRequest.put(feedUploadURL));
          secondFileStream.on('end', function(){
            sendEmail(shareURL, bookName);
            callback();
          });
        });
      });
    });
  });
}

var sendEmail = function(url, bookName)
{
  //now email it to me
  var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: gmailUsername,
          pass: gmailPassword
      }
  });

  var title = "Link to " + bookName + " instant podcast:";
  var body = title + "\n" + url;
  console.log(body);

  var mailOptions = {
      from: gmailUsername, // sender address
      to: emailToSendTo, // list of receivers
      subject: title, // Subject line
      text: body // plaintext body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          console.log(error);
      }else{
          console.log('Message sent: ' + info.response);
      }
  });
}
