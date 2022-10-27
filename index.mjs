import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { instrument } from "@socket.io/admin-ui"; // , RedisStore
import { url, username, password } from "./auth.mjs";
const HTTPServer = createServer();
const io = new Server(HTTPServer, {
  path: "/like",
  serveClient: false,
  cors: {
    origin: ["https://imadmin.canicode.cn"],
    credentials: true
  }
});
// const redisClient = createClient({ url });
const pubClient = createClient({ url });
const subClient = pubClient.duplicate();
const nameSpaced = io.of("like");
instrument(io, {
  mode: process.env.NODE_ENV,
  nameSpaced: "/admin",
  // store: new RedisStore(redisClient),
  auth: {
    type: "basic",
    username,
    password
  },
});
function adapterError() {
  console.error("adapter 错误回调");
}
function ioConnection(client) {
  function join(room) {
    // 除自己以外
    client.to(room).emit("joined", room, client.id);
  }
  function leave(room) {
    client.to(room).emit("leaved", room, client.id);
  }
  function getClientRoom(err, room) {
    if (err) return;
    logout(room);
  }
  function disconnect() {
    pubClient.get(client.id, getClientRoom);
  }
  function login(room) {
    client.join(room);
    pubClient.set(client.id, room);
    // 给自己发
    const myRoom = nameSpaced.adapter.rooms.get(room);
    if (myRoom) {
      client.emit("online", room, [...myRoom.keys()]);
    }
  }
  function logout(room) {
    client.leave(room);
    client.to(room).emit("logout", room, client.id);
    pubClient.del(client.id);
  }
  client.on("logout", logout);
  client.on("login", login);
  client.on("join", join);
  client.on("leave", leave);
  client.on("disconnect", disconnect);
  client.on("error", client.disconnect);
}
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  nameSpaced.on("connection", ioConnection);
  io.of("/").adapter.on("error", adapterError);
}).catch((error) => {
  console.error("client connection error: %O", error.message);
});
HTTPServer.listen(7777);
console.log("listen on port 7777");
