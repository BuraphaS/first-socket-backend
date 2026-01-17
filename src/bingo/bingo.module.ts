import { Module } from '@nestjs/common';

import { BingoGateway } from './bingo.gateway';

@Module({
  providers: [BingoGateway],
})
export class BingoModule {}
