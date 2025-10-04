import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export enum UserRole {
    LEARNER = 'learner',
    CONTENT_AUTHOR = 'content_author',
    CONTENT_REVIEWER = 'content_reviewer',
    ADMIN = 'admin',
}

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // For now, we'll use a temporary role assignment
        // In production, this would come from the JWT token or user service
        const userRole = this.getUserRole(user);

        const hasRole = requiredRoles.some((role) => this.hasPermission(userRole, role));

        if (!hasRole) {
            throw new ForbiddenException(
                `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`
            );
        }

        return true;
    }

    private getUserRole(user: any): UserRole {
        // Temporary implementation - in production this would come from JWT or user service
        return user.role || UserRole.CONTENT_AUTHOR;
    }

    private hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
        // Define role hierarchy
        const roleHierarchy = {
            [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.CONTENT_REVIEWER, UserRole.CONTENT_AUTHOR, UserRole.LEARNER],
            [UserRole.CONTENT_REVIEWER]: [UserRole.CONTENT_REVIEWER, UserRole.CONTENT_AUTHOR, UserRole.LEARNER],
            [UserRole.CONTENT_AUTHOR]: [UserRole.CONTENT_AUTHOR, UserRole.LEARNER],
            [UserRole.LEARNER]: [UserRole.LEARNER],
        };

        return roleHierarchy[userRole]?.includes(requiredRole) || false;
    }
}