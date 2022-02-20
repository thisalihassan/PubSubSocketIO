import { Server } from "socket.io";
import { createServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
const {
  get_Current_User,
  user_Disconnect,
  join_User,
  get_users_channel,
} = require("./channelUsers");
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
  //for a new user joining the channel
  try {
    console.log(socket.id);
    socket.on("joinRoom", ({ userID, firstName,lastName, channel }) => {
      //* create user
      const p_user = join_User(userID, firstName, lastName, channel);
      // const allChannelUsers = get_users_channel(channel);
      socket.join(p_user.channel);
      // socket.join(userID);
      // allChannelUsers.forEach(user=>{
      //   io.to(user.id).emit("channelJoined",{
      //     userID: p_user.id,
      //     channel,
      //   })
      // })

      //display a welcome message to the user who have joined a channel
      // socket.emit("message", {
      //   userID: p_user.id,
      //   firstName: p_user.firstName,
      //   message: `Welcome ${p_user.firstName}`,
      // });

      //displays a joined channel message to all other channel users except that particular user
      // socket.broadcast.to(p_user.channel).emit("message", {
      //   userID: p_user.id,
      //   firstName: p_user.firstName,
      //   message: `${p_user.firstName} has joined the chat`,
      // });
    });
    //user sending message
    socket.on("chat", ({ message, userID }) => {
      //gets the channel user and the message sent
      const p_user = get_Current_User(userID);

      io.to(p_user.channel).emit("message", {
        userID: p_user.id,
        firstName: p_user.firstName,
        lastName: p_user.lastName,
        message: message,
      });
    });

    //when the user exits the channel
    socket.on("disconnect", () => {
      //the user is deleted from array of users and a left channel message displayed
      const p_user = user_Disconnect(socket.id);

      if (p_user) {
        io.to(p_user.channel).emit("message", {
          userID: p_user.id,
          firstName: p_user.firstName,
          lastName: p_user.lastName,
          message: `${p_user.firstName} has left the channel`,
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});
