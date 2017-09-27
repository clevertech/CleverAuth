export interface IUser {
  id?: string
  name?: string
  username?: string
  firstName?: string
  lastName?: string
  email: string
  password?: string
  emailConfirmed?: boolean
  emailConfirmationToken?: string | null
}

export type IUserUpdate = { [K in keyof IUser]?: IUser[K] }

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
