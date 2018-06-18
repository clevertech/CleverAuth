import * as QRCode from 'qrcode'
import * as speakeasy from 'speakeasy'
import { IDatabaseAdapter } from './database/adapter'
import { IUser, IUserAgent } from './types'
import Crypto from './utils/crypto'
import JWT from './utils/jwt'
import DefaultPasswordService from './utils/passwords'
import Validations from './validations'

enum TokenIntent {
  ConfirmEmail = 'CONFIRM_EMAIL',
  ForgotPassword = 'FORGOT_PASSWORD'
}

export interface IEmailOptions {
  to: string
}

export interface IEmailService {
  sendWelcomeEmail: (
    user: IUser,
    agent: IUserAgent,
    emailConfirmationToken: string
  ) => Promise<void>

  sendPasswordResetHelpEmail: (email: string, agent: IUserAgent) => Promise<void>

  sendPasswordResetEmail: (
    user: IUser,
    agent: IUserAgent,
    emailConfirmationToken: string
  ) => Promise<void>

  sendChangeEmailEmail: (
    user: IUser,
    email: string,
    emailConfirmationToken: string,
    agent: IUserAgent
  ) => Promise<void>

  sendEmail: (
    options: {
      templateName: string
      emailOptions: IEmailOptions
      templateOptions: any
      language: string
    }
  ) => Promise<void>
}

export interface ISMSService {
  send2FAConfigurationToken: (
    projectName: string,
    user: IUser,
    phone: string,
    token: string
  ) => void
}

export interface IPasswordService {
  hash: (email: string, pass: string) => Promise<string>
  check: (email: string, pass: string, hash?: string) => Promise<boolean>
  invalidHash: () => Promise<string>
}

export interface ICoreConfig {
  projectName: string
  db: IDatabaseAdapter
  email: IEmailService
  crypto: Crypto
  jwt: JWT
  validations: Validations
  sms: ISMSService
  numberOfRecoverCodes?: number
  passwords: IPasswordService
}

export interface IUserRegisterOptions {
  email: string
  image: string
  password: string
  provider: string
}

export class CoreError extends Error {
  public readonly handled: boolean

  constructor(code: string) {
    super(code)
    this.handled = true
  }
}

export default class Core {
  private projectName: string
  private db: IDatabaseAdapter
  private email: IEmailService
  private crypto: Crypto
  private jwt: JWT
  private validations: Validations
  private sms: ISMSService
  private dumbArray: Array<string>
  private passwords: IPasswordService

  constructor(config: ICoreConfig) {
    this.projectName = config.projectName
    this.db = config.db
    this.email = config.email
    this.crypto = config.crypto
    this.jwt = config.jwt
    this.validations = config.validations
    this.sms = config.sms
    this.dumbArray = Array(config.numberOfRecoverCodes || 10).fill('')
    this.passwords = config.passwords || new DefaultPasswordService()
  }

  public async login(email: string, password: string, client?: any): Promise<IUser | undefined> {
    email = this.normalizeEmail(email)
    const user = await this.db.findUserByEmail(email)
    const ok = await this.passwords.check(email, password, user && user.password)
    if (!ok) {
      throw new CoreError('INVALID_CREDENTIALS')
    }
    return user
  }

  public async register(params: IUserRegisterOptions, client: IUserAgent) {
    const email = this.normalizeEmail(params.email)
    const { provider } = params
    delete params.provider
    if (!params.image) delete params.image // removes empty strings
    const exists = await this.db.findUserByEmail(email)
    if (exists) {
      throw new CoreError('USER_ALREADY_EXISTS')
    }
    if (!params.password && !provider) {
      throw new CoreError('PASSWORD_REQUIRED')
    }
    if (params.password) {
      const hash = await this.passwords.hash(params.email, params.password)
      params.password = hash
    }

    const userInfo = provider ? await this.jwt.verify(provider) : null
    const validation = this.validations.validate(provider, 'register', params)
    if (validation.error) {
      throw new CoreError(
        'FORM_VALIDATION_FAILED: ' +
          validation.error.details.map(detail => detail.message).join(', ')
      )
    }
    const user = validation.value

    const id = await this.db.insertUser(user)
    const emailConfirmationToken = await this.createToken(TokenIntent.ConfirmEmail, user, {
      id,
      email
    })
    await this.db.updateUser({ id, emailConfirmationToken })
    const providerUser = userInfo && userInfo.user
    if (providerUser) {
      return this.db.insertProvider({
        userId: id,
        login: user.login,
        data: user.data || {}
      })
    }

    const newUser = (await this.db.findUserByEmail(email))!
    // do not await here
    this.email.sendWelcomeEmail(newUser, client, emailConfirmationToken)
    return newUser
  }

  public async forgotPassword(email: string, client: IUserAgent) {
    email = this.normalizeEmail(email)
    const user = await this.db.findUserByEmail(email)
    if (!user) {
      // do not wait
      this.email.sendPasswordResetHelpEmail(email, client)
      return
    }
    const emailConfirmationToken = await this.createToken(TokenIntent.ForgotPassword, user)

    await this.db.updateUser({ id: user.id, emailConfirmationToken })
    // do not wait
    this.email.sendPasswordResetEmail(user, client, emailConfirmationToken)
  }

  public async resetPassword(token: string, password: string, client: IUserAgent) {
    const info = await this.findUserByEmailConfirmationToken(TokenIntent.ForgotPassword, token)
    const { user } = info
    const hash = await this.passwords.hash(user.email!, password)
    await this.db.updateUser({
      id: user.id,
      password: hash,
      emailConfirmed: true,
      emailConfirmationToken: null
    })
  }

  public async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.db.findUserById(id)
    if (!user) {
      throw new CoreError('USER_NOT_FOUND')
    }
    const ok = await this.passwords.check(user.email!, oldPassword, user.password!)
    if (!ok) {
      throw new CoreError('INVALID_CREDENTIALS')
    }
    const hash = await this.passwords.hash(user.email!, newPassword)
    await this.db.updateUser({
      id: user.id,
      password: hash
    })
    // TODO:
    // this.email.sendChangePasswordEmail(user, client)
  }

  public async changeEmail(id: string, password: string, newEmail: string, client: IUserAgent) {
    const email = this.normalizeEmail(newEmail)
    const user = await this.db.findUserById(id)
    if (!user) {
      throw new CoreError('USER_NOT_FOUND')
    }
    const ok = await this.passwords.check(user.email!, password, user.password!)
    if (!ok) {
      throw new CoreError('INVALID_CREDENTIALS')
    }
    const hash = await this.passwords.hash(email, password)
    const emailConfirmationToken = await this.createToken(TokenIntent.ConfirmEmail, user, {
      email,
      password: hash
    })
    await this.db.updateUser({ id: user.id, emailConfirmationToken })
    // do not await here
    this.email.sendChangeEmailEmail(user, email, emailConfirmationToken, client)
  }

  public async confirmEmail(token: string) {
    const info = await this.findUserByEmailConfirmationToken(TokenIntent.ConfirmEmail, token)
    const { user, data } = info
    const { email, password } = data
    if (!email) {
      throw new CoreError('INVALID_TOKEN')
    }
    const update = {
      id: user.id,
      email,
      emailConfirmed: true,
      emailConfirmationToken: null,
      password
    }
    if (!password) {
      delete update.password
    }
    await this.db.updateUser(update)
    return {
      firstTime: !password
    }
  }

  public async useRecoveryCode(userId: string, token: string) {
    const codes = await this.db.findRecoveryCodesByUserId(userId)
    await this.crypto.decryptRecovery(codes)

    const toUse = codes.find(code => {
      return !code.used && code.decrypted!.toUpperCase() === token.toUpperCase()
    })

    if (toUse) {
      return this.db.useRecoveryCode(userId, toUse.code)
    } else {
      throw new CoreError('RECOVERY_CODE_NOT_FOUND')
    }
  }

  public async generate2FASecret(user: IUser) {
    const secret = speakeasy.generateSecret({ name: user.email })
    return secret.base32
  }

  public async generate2FAQRCodeURL(user: IUser, twofactorSecret: string) {
    const url = speakeasy.otpauthURL({
      secret: twofactorSecret,
      encoding: 'base32',
      label: user.email,
      issuer: this.projectName
    })
    return new Promise<string>((resolve, reject) => {
      QRCode.toDataURL(url, (err, qrCode) => (err ? reject(err) : resolve(qrCode)))
    })
  }

  public async configure2FAQR(user: IUser, token: string, twofactorSecret: string) {
    const tokenValidates: boolean = (speakeasy.totp as any).verify({
      secret: twofactorSecret,
      encoding: 'base32',
      token,
      window: 6
    })
    if (!tokenValidates) {
      throw new CoreError('INVALID_AUTHENTICATION_CODE')
    }
    const encryptedSecret = await this.crypto.encrypt(twofactorSecret)
    await this.db.updateUser({
      id: user.id,
      twofactor: 'qr',
      twofactorSecret: encryptedSecret,
      twofactorPhone: null
    })
    return this.createRecoveryCodes(user)
  }

  public async send2FASMS(user: IUser, twofactorSecret: string, phone: string) {
    const token = speakeasy.totp({
      secret: twofactorSecret,
      encoding: 'base32'
    })
    this.sms.send2FAConfigurationToken(this.projectName, user, phone, token)
  }

  public async configure2FASMS(user: IUser, token: string, twofactorSecret: string, phone: string) {
    const tokenValidates: boolean = (speakeasy.totp as any).verify({
      secret: twofactorSecret,
      encoding: 'base32',
      token,
      window: 6
    })
    if (!tokenValidates) {
      throw new CoreError('INVALID_AUTHENTICATION_CODE')
    }
    const encryptedSecret = await this.crypto.encrypt(twofactorSecret)
    await this.db.updateUser({
      id: user.id,
      twofactor: 'sms',
      twofactorSecret: encryptedSecret,
      twofactorPhone: phone
    })
    return this.createRecoveryCodes(user)
  }

  public async validate2FAToken(id: string, token: string) {
    const user = await this.db.findUserById(id)
    if (!user) throw new CoreError('USER_NOT_FOUND')
    if (token.length > 6) {
      // it's a recovery code
      const used = await this.db.useRecoveryCode(id, token)
      if (!used) {
        throw new CoreError('INVALID_AUTHENTICATION_CODE')
      }
    } else {
      // it's an OTP
      const secret = await this.crypto.decrypt(user.twofactorSecret || '')
      const tokenValidates: boolean = (speakeasy.totp as any).verify({
        secret,
        encoding: 'base32',
        token,
        window: 6
      })
      if (!tokenValidates) {
        throw new CoreError('INVALID_AUTHENTICATION_CODE')
      }
    }
    return user
  }

  public async disable2FA(id: string, password: string) {
    const user = await this.db.findUserById(id)
    if (!user) throw new CoreError('USER_NOT_FOUND')
    const ok = await this.passwords.check(user.email, password, user.password)
    if (!ok) {
      throw new CoreError('INVALID_CREDENTIALS')
    }
    await this.db.updateUser({
      id: user.id,
      twofactor: null,
      twofactorSecret: null,
      twofactorPhone: null
    })
  }

  public async get2FAStatus(id: string) {
    const user = await this.db.findUserById(id)
    if (!user) throw new CoreError('USER_NOT_FOUND')
    const { twofactor, twofactorPhone } = user
    return { twofactor, twofactorPhone }
  }

  private normalizeEmail(email: string) {
    return email.toLowerCase()
  }

  private createToken(intent: TokenIntent, user: IUser, data: {} = {}) {
    return this.jwt.sign(
      { id: user.id!, ...data, code: this.crypto.random(), intent },
      { expiresIn: '24h' }
    )
  }

  private async createRecoveryCodes(user: IUser) {
    const codes = this.dumbArray.map(() => this.crypto.random(4))
    const encrypted = await Promise.all(codes.map(code => this.crypto.encrypt(code)))
    await this.db.insertRecoveryCodes(user.id!, encrypted)
    return codes
  }

  private async findUserByEmailConfirmationToken(expectedIntent: TokenIntent, token: string) {
    const data = await this.jwt.verify(token)
    const { id, intent } = data
    const user = await this.db.findUserById(id)
    if (!user || !intent || intent !== expectedIntent) {
      throw new CoreError('EMAIL_CONFIRMATION_TOKEN_NOT_FOUND')
    }
    return { user, data }
  }
}
