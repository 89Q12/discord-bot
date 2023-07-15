import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { User } from '@prisma/client';
import { BotService } from 'src/bot/bot.service';
import { UserService } from 'src/users/user.service';

@Injectable()
export class TasksService {
  constructor(
    @Inject(BotService) private botService: BotService,
    @Inject(UserService) private userService: UserService,
  ) {}

  @Cron('0 0 * * *', {
    name: 'checkActiveUsers',
    timeZone: 'Europe/Berlin',
  })
  async checkActiveUsers() {
    (await this.userService.findAll()).forEach(async (user: User) => {
      this.userService.updateMessageCountBucket(user);
      console.log(await this.userService.isActive(user));
      if (!(await this.userService.isActive(user)))
        this.botService.markMemberInactive(user);
      else this.botService.markMemberActive(user);
    });
  }
}
