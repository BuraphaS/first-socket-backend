import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
import { SocketModule } from './socket/socket.module';
import { ChatModule } from './chat/chat.module';
import { BingoModule } from './bingo/bingo.module';

@Module({
  imports: [SocketModule, ChatModule, BingoModule],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
