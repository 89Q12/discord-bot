import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Message } from 'discord.js';
import { SettingsService } from 'src/settings/settings.service';

interface DiscordExecutionContext extends ExecutionContext {
  getMessage(): Message;
}
@Injectable()
export class IsUserUnlockedGuard implements CanActivate {
  constructor(
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}
  async canActivate(context: DiscordExecutionContext): Promise<boolean> {
    const message: Message = context.getArgByIndex(0);
    return message.member.roles.cache.has(
      await this.settingsService.getVerifiedMemberRoleId(message.guildId),
    );
  }
}