import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/dispute.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateDisputeDto) {
    return this.disputes.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.disputes.list(user);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputes.resolve(id, dto);
  }
}
