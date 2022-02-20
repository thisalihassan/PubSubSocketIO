import { Server } from 'socket.io';
import { createServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const {
  getCurrentUser,
  userDisconnect,
  joinUser,
} = require('./channelUsers');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const pubClient = createClient({ url: 'redis://3.92.64.201:6379' });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    console.log('Connected');
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

io.on('connect', (socket) => {
  // for a new user joining the channel
  try {
    socket.on('joinRoom', ({
      userID, firstName, lastName, channel,
    }) => {
      //* create user
      const pUser = joinUser(userID, firstName, lastName, channel);
      console.log(pUser);
      // const allChannelUsers = getUserchannel(channel);
      socket.join(pUser.channel);
      // socket.join(userID);
      // allChannelUsers.forEach(user=>{
      //   io.to(user.id).emit("channelJoined",{
      //     userID: pUser.id,
      //     channel,
      //   })
      // })

      // display a welcome message to the user who have joined a channel
      // socket.emit("message", {
      //   userID: pUser.id,
      //   firstName: pUser.firstName,
      //   message: `Welcome ${pUser.firstName}`,
      // });

      // displays a joined channel message to all other channel users except that particular user
      // socket.broadcast.to(pUser.channel).emit("message", {
      //   userID: pUser.id,
      //   firstName: pUser.firstName,
      //   message: `${pUser.firstName} has joined the chat`,
      // });
    });
    // user sending message
    socket.on('chat', ({ message, userID, channel }) => {
      // gets the channel user and the message sent
      const pUser = getCurrentUser(userID, channel);

      io.to(pUser.channel).emit(`message${pUser.channel}`, {
        userID: pUser.id,
        firstName: pUser.firstName,
        lastName: pUser.lastName,
        message,
      });
    });

    // when the user exits the channel
    socket.on('disconnect', () => {
      // the user is deleted from array of users and a left channel message displayed
      const pUser = userDisconnect(socket.id);

      if (pUser) {
        io.to(pUser.channel).emit(`message${pUser.channel}`, {
          userID: pUser.id,
          firstName: pUser.firstName,
          lastName: pUser.lastName,
          message: `${pUser.firstName} has left the channel`,
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});
