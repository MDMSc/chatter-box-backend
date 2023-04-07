import mongoose from "mongoose";

mongoose.set("strictQuery", "false");

export const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then((data) => console.log(`MongoDB connected: ${data.connection.host}`))
    .catch((error) => {
      console.log(`Error: ${error.message}`);
      process.exit();
    });
};
