import { IProvider, IRecoveryCode, IUser, IUserUpdate } from '../types';

export interface IDatabaseAdapter {
  init: () => Promise<void>

  findUserByEmail: (email: string) => Promise<IUser | undefined>

  findUserById: (id: string) => Promise<IUser | undefined>

  findUserByProviderLogin: (login: string) => Promise<IUser | undefined>

  findRecoveryCodesByUserId: (userId: string) => Promise<IRecoveryCode[]>

  insertRecoveryCodes: (
    userId: string,
    codes: string[]
  ) => Promise<IRecoveryCode[]>

  useRecoveryCode: (userId: string, code: string) => Promise<boolean>

  insertUser: (user: IUser) => Promise<string>

  updateUser: (user: IUserUpdate) => Promise<void>

  insertProvider: (provider: IProvider) => Promise<void>
}
