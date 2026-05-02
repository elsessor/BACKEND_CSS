
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*"
  }
});

// Attach io to app for access in routes/services
app.set("io", io);

httpServer.listen(env.port, () => {
  console.log(`CSS backend running on http://localhost:${env.port}`);
});

export { io };
