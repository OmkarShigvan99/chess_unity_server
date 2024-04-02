// Importing dotenv module to load environment variables from a .env file into process.env
import dotenv from "dotenv";
dotenv.config({
    path: "./.env", // Specifying the path to the .env file
});

// Importing the main application, database connection and Redis connection modules
import app from "./app.js";
import connectDB from "./db/database.js";
import redisDB from "./db/database.redis.js";

// Importing the socket.io connection module
import socketIO from "./sockets/index.js";

// Setting the port for the server to listen on, default is 4000
const port = process.env.PORT || 4000;

// Event listener for any errors that occur in the app
app.on("error", (error) => {
    console.log("Application Unable to connect with DB: ", error);
    throw error;
});

// Function to initiate connections to the MongoDB and Redis databases, and start the server
async function initiateConnections() {
    try {
        await connectDB(); // Connect to MongoDB
        await redisDB.connect(); // Connect to Redis
        const server = await socketIO.connect(app); // Connect to socket.io
        // Start the server and listen on the specified port
        server.listen(port, () => {
            console.log(`Server is listen at the port ${port}`);
            console.log(`http://localhost:${port}/`);
        });
        console.log("Server is running...");
    } catch (err) {
        // If any error occurs during the connection process, log the error and exit the process
        console.log("Error while connecting to the server", err);
        process.exit(1);
    }
}

// Call the function to initiate the connections
initiateConnections();