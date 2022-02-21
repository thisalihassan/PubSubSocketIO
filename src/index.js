import { Server } from "socket.io";
import { createServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const { getCurrentUser, userDisconnect, joinUser } = require("./channelUsers");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const pubClient = createClient({ url: "redis://3.92.64.201:6379" });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    console.log("Connected");
    io.adapter(createAdapter(pubClient, subClient));
    io.listen(8080);
  })
  .catch((err) => console.log(err));

// async function sendMessage(socket) {
//   const data = await pubClient.lRange("messages", 0, -1);
//   data.map((x) => {
//     const usernameMessage = x.split("<--->");
//     const redisMessage = JSON.parse(usernameMessage[1]);
//     socket.emit('previousMessages', redisMessage);
//   });
// }

io.on("connect", (socket) => {
  // for a new user joining the channel
  try {
    socket.on("notify", ({ userID }) => {
      console.log(userID);
      socket.join(userID);
    });

    socket.on(
      "makeNotification",
      ({ notification, userID, isFriendRequest = false }) => {
        // gets the channel user and the message sent
        try {
          console.log(notification, userID, isFriendRequest);
          io.to(userID).emit("notification", {
            notification,
            isFriendRequest,
          });
        } catch (error) {
          console.log(error);
        }
      }
    );

    socket.on("joinRoom", ({ userID, firstName, lastName, channel }) => {
      //* create user
      const pUser = joinUser(userID, firstName, lastName, channel);
      socket.join(pUser.channel);
    });
    // user sending message
    socket.on("chat", ({ message, userID, channel }) => {
      // gets the channel user and the message sent
      try {
        const pUser = getCurrentUser(userID, channel);
        io.to(pUser.channel).emit(`message${pUser.channel}`, {
          userID: pUser.id,
          firstName: pUser.firstName,
          lastName: pUser.lastName,
          message,
        });
      } catch (error) {
        console.log(error);
      }
    });

    // when the user exits the channel
    socket.on("disconnect", () => {
      // the user is deleted from array of users and a left channel message displayed
      try {
        const pUser = userDisconnect(socket.id, "something");

        if (pUser) {
          io.to(pUser.channel).emit(`message${pUser.channel}`, {
            userID: pUser.id,
            firstName: pUser.firstName,
            lastName: pUser.lastName,
            message: `${pUser.firstName} has left the channel`,
          });
        }
      } catch (error) {
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
});
