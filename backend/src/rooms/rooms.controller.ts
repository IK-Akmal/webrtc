import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('ice-config')
  iceConfig(@CurrentUser() user: JwtPayload) {
    return this.roomsService.getIceConfig(user.sub);
  }

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: JwtPayload) {
    return this.roomsService.create(user.sub, dto);
  }

  @Get(':id/livekit-token')
  getLivekitToken(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('password') password?: string,
  ) {
    return this.roomsService.getLivekitToken(id, user.sub, user.displayName, password);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() patch: Partial<CreateRoomDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.update(id, user.sub, patch);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.remove(id, user.sub);
  }
}
