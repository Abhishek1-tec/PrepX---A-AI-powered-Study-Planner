/** MongoDB connection - used by index.js */

import mongoose from 'mongoose';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepx');
};

export default connectDB;
