import { Server, Socket } from 'socket.io';

import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

type Player = 'p1' | 'p2' | null;

interface PlayerInfo {
  id: string;
  name: string;
  role: 'p1' | 'p2';
}

interface GameRoom {
  board: Player[];
  players: PlayerInfo[];
  currentPlayer: Player;
  winner: Player;
  winningIndexes: number[];
}

const ROWS = 6;
const COLS = 7;
const WIN_COUNT = 5;

const rooms = new Map<string, GameRoom>();

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
export class BingoGateway {
  @WebSocketServer()
  server: Server;

  /* ---------------- join room ---------------- */
  @SubscribeMessage('bingo:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; name: string },
  ) {
    const { roomId } = payload;

    client.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        board: Array(42).fill(null) as Player[],
        players: [],
        currentPlayer: null,
        winner: null,
        winningIndexes: [],
      });
    }

    client.emit('joined');
  }

  /* ---------------- drop action ---------------- */
  @SubscribeMessage('bingo:drop')
  handleDrop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string; col: number },
  ) {
    const room = rooms.get(payload.room);
    if (!room || room.winner || !room.currentPlayer) return;

    const player = room.players.find((p) => p.id === client.id);
    if (!player) return;

    if (player.role !== room.currentPlayer) return;

    for (let r = ROWS - 1; r >= 0; r--) {
      const index = r * COLS + payload.col;

      if (room.board[index] === null) {
        room.board[index] = player.role;

        const winLine = this.checkWin(room.board, index);
        if (winLine.length) {
          room.winner = player.role;
          room.winningIndexes = winLine;

          this.server.to(payload.room).emit('gameOver', {
            winner: room.winner,
            winningIndexes: winLine,
          });
        } else {
          room.currentPlayer = room.currentPlayer === 'p1' ? 'p2' : 'p1';
        }

        this.server.to(payload.room).emit('droped', {
          col: payload.col,
          index,
          player: player.role,
          currentPlayer: room.currentPlayer,
        });
        return;
      }
    }
  }

  checkWin(board: Player[], start: number): number[] {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    const r0 = Math.floor(start / COLS);
    const c0 = start % COLS;
    const type = board[start];

    for (const [dr, dc] of directions) {
      const line = [start];

      let r = r0 + dr;
      let c = c0 + dc;
      while (this.inBoard(r, c) && board[r * COLS + c] === type) {
        line.push(r * COLS + c);
        r += dr;
        c += dc;
      }

      r = r0 - dr;
      c = c0 - dc;
      while (this.inBoard(r, c) && board[r * COLS + c] === type) {
        line.unshift(r * COLS + c);
        r -= dr;
        c -= dc;
      }

      if (line.length >= WIN_COUNT) return line;
    }

    return [];
  }
  inBoard(r: number, c: number) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  @SubscribeMessage('chooseSide')
  handleChooseSide(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { roomId: string; role: 'p1' | 'p2'; name: string },
  ) {
    const room = rooms.get(payload.roomId);
    if (!room) return;

    client.join(payload.roomId);

    const existingPlayer = room.players.find((p) => p.name === payload.name);

    if (existingPlayer) {
      existingPlayer.id = client.id;

      client.emit('playerAssigned', { role: existingPlayer.role });
      this.server.to(payload.roomId).emit('playersUpdate', room.players);
      return;
    }

    if (room.players.some((p) => p.role === payload.role)) {
      client.emit('sideTaken', payload.role);
      return;
    }

    room.players.push({
      id: client.id,
      name: payload.name,
      role: payload.role,
    });

    client.emit('playerAssigned', { role: payload.role });
    this.server.to(payload.roomId).emit('playersUpdate', room.players);

    if (room.players.length === 2) {
      room.board = Array(42).fill(null) as Player[];
      room.currentPlayer = 'p1';
      room.winner = null;
      room.winningIndexes = [];

      this.server.to(payload.roomId).emit('gameStart', {
        currentPlayer: room.currentPlayer,
        players: room.players,
      });
    }
  }

  @SubscribeMessage('bingo:reset')
  handleReset(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const room = rooms.get(payload.roomId);
    if (!room) return;

    // อนุญาตเฉพาะคนในห้อง
    const isPlayer = room.players.some((p) => p.id === client.id);
    if (!isPlayer) return;

    room.board = Array(ROWS * COLS).fill(null) as Player[];
    room.players = [];
    room.currentPlayer = null;
    room.winner = null;
    room.winningIndexes = [];

    this.server.to(payload.roomId).emit('gameReset');
  }
}
