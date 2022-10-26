import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { instrument, RedisStore } from "@socket.io/admin-ui";

const HTTPServer = createServer();
const io = new Server(HTTPServer, {
  path: "/like",
  serveClient: false,
  cors: {
    origin: ["https://imadmin.canicode.cn"],
    credentials: true
  }
});
const redisClient = createClient({ url: "redis://default:redispw@localhost:55000" });
const pubClient = createClient({ url: "redis://default:redispw@localhost:55000" });
const subClient = pubClient.duplicate();
function adapterError() {
  console.log("adapter 错误回调");
}
function ioConnection(client) {
  console.log(client);
}
Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  // const nameSpaced = io.of("like");
  // nameSpaced.on("connection", ioConnection);
  // io.of("/").adapter.on("error", adapterError);
  instrument(io, {
    mode: process.env.NODE_ENV,
    nameSpaced: "/admin",
    store: new RedisStore(redisClient),
    auth: {
      type: "basic",
      username: "admin",
      password: "$2a$10$Ozn1B0ou0MOu9KjGu2Gmc.6ha6r1wUJ3W3qw2w4jwBuiSzLfiYze."
    },
  });
  HTTPServer.listen(7777);
  console.log("listen on port 7777");
}).catch((error) => {
  console.error("client connection error: %O", error.message);
});
