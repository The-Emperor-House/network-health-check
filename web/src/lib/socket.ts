import { io, Socket } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

let socketInstance: Socket | null = null;

/** Singleton socket — reuse ตลอด lifetime ของ browser tab */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socketInstance;
}
