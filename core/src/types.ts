export interface IUser {
  id?: string
  name?: string
  username?: string
  firstName?: string
  lastName?: string
  email: string
  password?: string
  emailConfirmed?: boolean
  emailConfirmationToken?: string
  twofactor?: string
  twofactorPhone?: string
  twofactorSecret?: string
}

export type IUserUpdate = { [K in keyof IUser]?: IUser[K] | null }

export interface IProvider {
  userId: string
  login: string
  data: {}
}

export interface IRecoveryCode {
  code: string
  decrypted?: string
  used: boolean
}

export interface IUserAgent {
  agent: string
  os: string
  device: string
  ip: string
  language: string
}
