const cUsers = [];

// joins the user to the specific chatroom
function joinUser(id, firstName, lastName, channel) {
  const pUser = {
    id, firstName, lastName, channel,
  };
  if (!cUsers.some((user) => user.id === id && user.channel === channel)) {
    cUsers.push(pUser);
    console.log(pUser);
  }
  return pUser;
}

function getUserchannel(channel) {
  return cUsers.filter((pUser) => pUser.channel === channel);
}

// Gets a particular user id to return the current user
function getCurrentUser(id, channel) {
  return cUsers.find((pUser) => pUser.id === id && pUser.channel === channel);
}

// called when the user leaves the chat and its user object deleted from array
function userDisconnect(id, channel) {
  const index = cUsers.findIndex((pUser) => pUser.id === id && pUser.channel === channel);

  if (index !== -1) {
    return cUsers.splice(index, 1)[0];
  }
}

module.exports = {
  joinUser,
  getCurrentUser,
  userDisconnect,
  getUserchannel,
};
