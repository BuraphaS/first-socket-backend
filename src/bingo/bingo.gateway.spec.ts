import { Test, TestingModule } from '@nestjs/testing';
import { BingoGateway } from './bingo.gateway';

describe('BingoGateway', () => {
  let gateway: BingoGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BingoGateway],
    }).compile();

    gateway = module.get<BingoGateway>(BingoGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
