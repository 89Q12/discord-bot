import { Inject, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  async unlockUser(userId: string) {
    const user = await this.findOne(parseInt(userId));
    this.database.user.update({
      where: { userId: user.userId },
      data: { unlocked: true },
    });
  }
  async setFirstMessageId(mId: string, userId: string) {
    const user = await this.findOne(parseInt(userId));
    this.database.stats.update({
      where: { userId: user.userId },
      data: { firstMessageId: parseInt(mId) },
    });
  }
  constructor(@Inject(PrismaService) private database: PrismaService) {}

  async findOne(userId: number): Promise<User | undefined> {
    return this.database.user.findUnique({ where: { userId } });
  }
  async getStats(userId: number) {
    return this.database.stats.findUnique({ where: { userId } });
  }

  async findOrCreate(
    userId: number,
    name: string,
    guildId: number,
  ): Promise<User> {
    let user = await this.findOne(userId);
    if (user) return user;

    await this.database.stats.create({
      data: { userId, guildId },
    });
    user = await this.database.user.create({
      data: { userId, name, guildId },
    });

    return user;
  }

  async insertMessage(
    userId: number,
    messageId: number,
    channelId: number,
    guildId: number,
  ) {
    await this.database.message.create({
      data: {
        userId,
        guildId,
        messageId,
        createdAt: new Date(),
        channelId,
      },
    });
  }

  async deleteOne(userId: number): Promise<void> {
    await this.database.user.delete({ where: { userId } });
  }
  async findAll(): Promise<Array<User>> {
    return this.database.user.findMany();
  }

  async updateMessageCountBucket(user: User): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messageCount = await this.database.message.count({
      where: {
        userId: user.userId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });
    await this.database.stats.update({
      where: { userId: user.userId },
      data: { messageCountBucket: messageCount },
    });
  }
  async isActive(user: User): Promise<boolean> {
    return (
      (await this.database.stats.findUnique({ where: { userId: user.userId } }))
        .messageCountBucket >= 30
    );
  }
  // SELECT
  //   m.channelId,
  //   m.userId,
  //   COUNT(m.messageId) AS messageCount,
  //   AVG(subquery.messageCount) AS avgMessageCount
  // FROM
  //   Message m
  // JOIN
  //   (SELECT channelId, COUNT(messageId) / 30 AS messageCount
  //   FROM Message
  //   WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  //   GROUP BY channelId) AS subquery ON m.channelId = subquery.channelId
  // WHERE
  //   m.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  // GROUP BY
  //   m.channelId, m.userId
  // ORDER BY
  //   avgMessageCount DESC;
  async averageMessagesPerChannelLastMonth(): Promise<Record<string, number>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const messageStats = await this.database.message.groupBy({
      by: ['channelId', 'userId'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        messageId: true,
      },
    });

    const messageCounts: Record<
      string,
      Record<string, number>
    > = messageStats.reduce((acc, curr) => {
      const channelId = curr.channelId.toString();
      const userId = curr.userId.toString();
      const count = curr._count?.messageId ?? 0;

      if (!acc[channelId]) {
        acc[channelId] = {};
      }

      acc[channelId][userId] = count;

      return acc;
    }, {});

    const avgMessageCounts = {};

    for (const channelId in messageCounts) {
      const userCounts = Object.values(messageCounts[channelId]);
      const avgMessageCount =
        userCounts.reduce((sum, count) => sum + count, 0) / userCounts.length;
      avgMessageCounts[channelId] = avgMessageCount;
    }

    return avgMessageCounts;
  }
}
