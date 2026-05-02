import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  maxParticipants?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;
}
