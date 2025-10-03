import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class EnableMfaDto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
    totpCode: string;
}

export class DisableMfaDto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
    totpCode: string;
}

export class VerifyMfaDto {
    @IsString()
    @IsNotEmpty()
    code: string; // Can be TOTP (6 digits) or backup code (8 chars)
}

export class RegenerateBackupCodesDto {
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
    totpCode: string;
}

export class MfaRequiredDto {
    @IsString()
    @IsNotEmpty()
    operation: string;
}