import { Server, Socket } from 'socket.io';

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('User connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('User disconnected:', client.id);
  }

  // join room
  @SubscribeMessage('chat:join-room')
  handleJoinRoom(client: Socket, roomId: string) {
    client.join(roomId);
    client.emit('joined', roomId);
  }

  // send message
  @SubscribeMessage('chat:send-message')
  handleMessage(
    client: Socket,
    payload: {
      roomId: string;
      message: string;
      sender: string;
    },
  ) {
    this.server.to(payload.roomId).emit('new-message', {
      sender: payload.sender,
      message: payload.message,
      time: Date.now(),
    });
  }
}
