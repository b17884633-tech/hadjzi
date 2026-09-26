import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @Post('initiate')
  initiate(@CurrentUser() user: User, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiate(user, dto);
  }

  @Public()
  @Post('webhooks')
  webhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') signature?: string,
  ) {
    return this.payments.handleWebhook(body, signature);
  }
}
