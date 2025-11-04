import { IsNumber, IsOptional, IsString, Min, MinLength, IsIn } from 'class-validator';

export class MockTradeDto {
  @IsString()
  @MinLength(6)
  tradeId!: string;

  @IsString()
  @MinLength(6)
  userId!: string;

  @IsNumber()
  @Min(0)
  feeAmount!: number;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  @IsIn(['EVM', 'SVM'])
  chain?: 'EVM' | 'SVM';
}




