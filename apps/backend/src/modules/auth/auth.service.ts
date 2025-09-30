import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  me() {
    return {
      id: 'mock-user',
      email: 'mock@astalla.com',
      name: 'Mock User',
      roles: ['ORG_ADMIN'],
      propertyIds: ['prop-1', 'prop-2']
    };
  }
}
