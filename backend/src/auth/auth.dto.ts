import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class UserCreateDto {
  @IsString()
  @Length(2, 60)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'A senha deve conter ao menos uma letra maiúscula' })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número' })
  @Matches(/[!@#$%^&*]/, {
    message: 'A senha deve conter ao menos um caractere especial (!@#$%^&*)',
  })
  password: string;
}

export class UserLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}