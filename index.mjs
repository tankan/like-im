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
    origin: ["http://localhost:5173", "https://js.icu", "https://imadmin.canicode.cn", "https://tv.canicode.cn"],
    credentials: true
  }
});
// const redisClient = createClient({ url });
const pubClient = createClient({ url });
const subClient = pubClient.duplicate();
const nameSpaced = io.of("/");
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
  // console.log("用户 %O 连接房间", client.id);
  async function join(room) {
    // console.log("用户 %O 加入房间：%O", client.id, room);
    client.join(room);
    await pubClient.set(client.id, room);
    // 除自己以外
    client.to(room).emit("joined", room, client.id);
  }
  function leave(room) {
    // console.log("用户 %O 离开房间： %O", client.id, room);
    client.to(room).emit("leaved", room, client.id);
  }
  async function disconnect() { // reason
    const room = await pubClient.get(client.id);
    // console.log("用户 %O 断开连接: %o, 房间： %O", client.id, reason, room);
    room && logout(room);
  }
  function login(room) {
    // console.log("用户 %O 登陆房间： %O", client.id, room);
    // 给自己发
    const myRoom = nameSpaced.adapter.rooms.get(room);
    if (myRoom) {
      client.emit("online", room, [...myRoom.keys()]);
      client.to(room).emit("logged", room, client.id);
    }
  }
  function logout(room) {
    // console.log("用户 %O 退出房间： %O", client.id, room);
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
