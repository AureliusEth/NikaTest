import { IsString, MinLength } from 'class-validator';

export class ReferralRegisterDto {
  @IsString()
  @MinLength(3)
  code!: string;
}




