import { IsIn } from 'class-validator';

export class ListUsersQueryDto {
  @IsIn(['HR', 'ADMIN', 'BUSINESS', 'USER'])
  role: 'HR' | 'ADMIN' | 'BUSINESS' | 'USER';
}
