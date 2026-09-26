import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { AccountStatus, UserRole } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  findByPhone(phone: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone })
      .getOne();
  }

  async createCustomer(input: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    password: string;
  }) {
    const existing = await this.users.findOne({ where: { phone: input.phone } });
    if (existing) {
      throw new ConflictException('Phone already registered');
    }
    if (input.email) {
      const emailTaken = await this.users.findOne({ where: { email: input.email } });
      if (emailTaken) {
        throw new ConflictException('Email already registered');
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email ?? null,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: AccountStatus.PENDING_VERIFICATION,
    });
    return this.users.save(user);
  }

  async markPhoneVerified(userId: string) {
    await this.users.update(userId, {
      phoneVerified: true,
      status: AccountStatus.ACTIVE,
    });
    return this.findByIdOrFail(userId);
  }

  async updateProfile(
    userId: string,
    patch: { firstName?: string; lastName?: string; email?: string },
  ) {
    if (patch.email) {
      const emailTaken = await this.users.findOne({ where: { email: patch.email } });
      if (emailTaken && emailTaken.id !== userId) {
        throw new ConflictException('Email already registered');
      }
    }
    await this.users.update(userId, patch);
    return this.findByIdOrFail(userId);
  }

  async setRole(userId: string, role: UserRole) {
    await this.users.update(userId, { role });
    return this.findByIdOrFail(userId);
  }
}
