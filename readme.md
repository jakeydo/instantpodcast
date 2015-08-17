# instantpodcast
I had a directory of MP3s and I wanted to make it into a "podcast" that I could listen to in my iPhone's Podcasts app.

## Getting started
1. Download and run
```terminal
npm install
```
1. Visit [Dropbox App Console](https://www.dropbox.com/developers/apps) and create a new app so that you can have access to the Dropbox API.
1. [Generate an access token](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/)
1. Edit `instantpodcast.js` and enter your Dropbox access token as `authToken`.
1. I wanted the app to mail me a link to the feed, and I used [nodemailer](https://github.com/andris9/Nodemailer) to access my Gmail account. If you want the app to email you, you will need to provide the credentials for a Gmail account in `gmailPassword` and `gmailUsername`. You will also need to provide an email address that you would like the message delivered to in `emailToSendTo`. If you don't provide credentials, the app will show an error when it tries to send the email.
1. I used
```terminal
chmod u+x instantpodcast.js
```
to make `instantpodcast.js` executable (notice the [shebang](http://stackoverflow.com/a/24253067/1519621) in instantpodcast.js).
1. I also added the directory where `instantpodcast.js` was located to my path so that I would be able to run it from anywhere.

## Using instantpodcast

1. To use instantpodcast, you need a folder full of MP3s and a single .jpg to act as the podcast artwork. The files I had in mind for this were already numbered such as:
```terminal
SomeSound-Part01.mp3
SomeSound-Part02.mp3
SomeSound-Part03.mp3
SomeSound.jpg
```
1. Run instantpodcast.js in a folder with files such as that, it will create a folder in Dropbox called `/SomeSound/` (the name of the .jpg file). It will then upload the MP3s and .jpg, pull the Dropbox share URLs and build an RSS feed called `feed.xml`, upload that file to the Dropbox folder, and email a link to the feed to the address you provided. If your phone is set up the same way mine is, clicking the link will open the feed in the Podcasts app. The feed will show titles such as **SomeSound 1 of 3**.
