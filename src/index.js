import { Server } from "socket.io";
import { createServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    console.log("Connected");
    io.adapter(createAdapter(pubClient, subClient));
    io.listen(8080);
  })
  .catch((err) => console.log(err));

async function sendMessage(socket) {
  const data = await pubClient.lRange("messages", 0, -1);
  data.map((x) => {
    const usernameMessage = x.split("<--->");
    const redisMessage = JSON.parse(usernameMessage[1]);
    socket.emit('previousMessages', redisMessage);
  });
}

io.on("connect", (socket) => {
  console.log(socket.id);
  sendMessage(socket);
  socket.on("sendMessage", (tuple) => {
    const points = [tuple.id, tuple.currentUser];
    points.sort(function (a, b) {
      return a - b;
    });
    const uniqueUserName = `${points[0]}${points[1]}`;
    pubClient.rPush("messages", `${uniqueUserName}<--->${JSON.stringify(tuple)}`);
    io.emit(`messageRecieve${tuple.id}`, tuple);
  });
});
