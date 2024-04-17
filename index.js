import express from 'express';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Pusher from 'pusher';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import Grid from 'gridfs-stream';
import bodyParser from 'body-parser';
import path from 'path';
import Posts from './postModel.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const PASSWORD_DB = process.env.PASSWORD_DB;
const LOGIN_DB = process.env.LOGIN_DB;

const connection_url = `mongodb+srv://${LOGIN_DB}:${PASSWORD_DB}@cluster0.rygv9wf.mongodb.net/?retryWrites=true&w=majority`;
const pusher = new Pusher({
  appId: process.env.PUSHER_API_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const connection = mongoose.createConnection(connection_url);

mongoose.connect(connection_url);

connection.once('open', () => {
  const gfs = Grid(connection.db, mongoose.mongo);
  console.log('DB Connected');
  gfs.collection('images');
});

const storage = new GridFsStorage({
  url: connection_url,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = `image-${Date.now()}${path.extname(file.originalname)}`;
      const fileInfo = { filename: filename, bucketName: 'images' };
      resolve(fileInfo);
    });
  },
});

const upload = multer({ storage });

const changeStream = Posts.watch();

changeStream.on('change', (change) => {
  console.log(change);
  if (change.operationType === 'insert') {
    const messageDetails = change.fullDocument;
    console.log(messageDetails);
    pusher.trigger('posts', 'inserted', {
      change: change,
    });
  } else {
    console.log('Error trigerring Pusher');
  }
});

app.use(bodyParser.json());
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('ok');
});

app.post('/upload/image', upload.single('file'), (req, res) => {
  res.status(201).send(req.file);
});

app.get('/images/single', (req, res) => {
  gfs.files.findOne({ filename: req.query.name }, (err, file) => {
    if (err) {
      res.status(500).send(err);
    } else {
      if (!file || file.length === 0) {
        res.status(404).json({ err: 'file not found' });
      } else {
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      }
    }
  });
});

app.post('/upload/post', (req, res) => {
  const dbPost = req.body;
  Posts.create(dbPost)
    .then((r) => {
      res.status(201).send(data);
    })
    .catch((e) => {
      res.status(500).send(err);
    });
});

app.get('/posts', (req, res) => {
  Posts.find()
    .then((r) => {
      data.sort((b, a) => a.timestamp - b.timestamp);
      res.status(201).send(data);
    })
    .catch((e) => {
      res.status(500).send(err);
    });
});

app.listen(PORT, () => {
  return `server start on ${PORT}`;
});
