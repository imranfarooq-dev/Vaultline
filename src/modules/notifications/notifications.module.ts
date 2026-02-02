import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../../database/entities';
import { NotificationsController } from './notifications.controller';

@Module({ imports: [TypeOrmModule.forFeature([NotificationEntity])], controllers: [NotificationsController] })
export class NotificationsModule {}
