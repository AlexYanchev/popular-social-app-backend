import mongoose from 'mongoose';
const postsModel = mongoose.Schema({
  user: String,
  imgName: String,
  text: String,
  avatar: String,
  timestamp: String,
});

const Posts = mongoose.model('socialPosts', postsModel);
export default Posts;
