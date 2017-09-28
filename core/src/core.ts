import * as passwords from './utils/passwords'
import { IUser, IUserAgent } from './types'
import Crypto from './utils/crypto'
import JWT from './utils/jwt'
import { IDatabaseAdapter } from './database/adapter'
import Validations from './validations'

export interface IEmailService {
  sendWelcomeEmail: (
    user: IUser,
    agent: IUserAgent,
    emailConfirmationToken: string
  ) => Promise<void>

  sendPasswordResetHelpEmail: (
    email: string,
    agent: IUserAgent
  ) => Promise<void>

  sendPasswordResetEmail: (
    user: IUser,
    agent: IUserAgent,
    emailConfirmationToken: string
  ) => Promise<void>
}

export interface IMediaOptions {
  localPath?: string
  buffer?: string
  destinationPath?: string
  contentType?: string
  expires?: number
  imageOperations?: {
    width?: number
    height?: number
    resize?: string
    autoRotate?: boolean
    normalize?: boolean
    appendExtension?: boolean
    grayscale?: boolean
  }
}

export interface IMediaService {
  upload: (info: IMediaOptions) => Promise<{ url: string }>
}

export interface ICoreConfig {
  db: IDatabaseAdapter
  email: IEmailService
  media: IMediaService
  crypto: Crypto
  jwt: JWT
  validations: Validations
  numberOfRecoverCodes?: number
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
  private db: IDatabaseAdapter
  private email: IEmailService
  private media: IMediaService
  private crypto: Crypto
  private jwt: JWT
  private validations: Validations
  private dumbArray: Array<undefined>

  constructor(config: ICoreConfig) {
    Object.assign(this, config)
    this.dumbArray = Array(config.numberOfRecoverCodes || 10)
  }

  public async login(
    email: string,
    password: string,
    client?: any
  ): Promise<IUser | undefined> {
    email = this.normalizeEmail(email)
    const user = await this.db.findUserByEmail(email)
    // If the user does not exist, use the check function anyways
    // to avoid timing attacks.
    // See https://en.wikipedia.org/wiki/Timing_attack
    const ok = await passwords.check(
      email,
      password,
      (user && user.password) || (await passwords.invalidHash())
    )
    if (!ok) {
      throw new CoreError('INVALID_CREDENTIALS')
    }
    return user
  }

  public async createRecoveryCodes(user: IUser) {
    const codes = await Promise.all(
      this.dumbArray.map(() => this.crypto.encrypt(this.crypto.random(4)))
    )
    this.db.insertRecoveryCodes(user.id!, codes)
  }

  public async register(params: IUserRegisterOptions, client: IUserAgent) {
    const email = this.normalizeEmail(params.email)
    const { provider } = params
    delete params.provider
    if (!params.image) delete params.image // removes empty strings
    const emailConfirmationToken = await this.createToken()
    const exists = this.db.findUserByEmail(email)
    if (exists) {
      throw new CoreError('USER_ALREADY_EXISTS')
    }
    if (!params.password && !provider) {
      throw new CoreError('PASSWORD_REQUIRED')
    }
    if (params.password) {
      const hash = await passwords.hash(params.email, params.password)
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

    if (user.image) {
      const response = await this.media.upload({
        buffer: user.image,
        destinationPath: 'user-' + Date.now(),
        imageOperations: {
          width: 160,
          height: 160,
          autoRotate: true,
          appendExtension: true
        }
      })
      user.image = response.url
    }

    const id = await this.db.insertUser(
      Object.assign({}, user, {
        emailConfirmationToken
      })
    )
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
    const emailConfirmationToken = await this.createToken()
    const user = await this.db.findUserByEmail(email)

    if (!user) {
      // do not wait
      this.email.sendPasswordResetHelpEmail(email, client)
      return
    }

    await this.db.updateUser({ id: user.id, emailConfirmationToken })
    // do not wait
    this.email.sendPasswordResetEmail(user, client, emailConfirmationToken)
  }

  public async resetPassword(
    token: string,
    password: string,
    client: IUserAgent
  ) {
    const user = await this.db.findUserByEmailConfirmationToken(token)
    if (!user) {
      throw new CoreError('EMAIL_CONFIRMATION_TOKEN_NOT_FOUND')
    }

    const hash = await passwords.hash(user.email!, password)
    await this.db.updateUser({
      id: user.id,
      password: hash,
      emailConfirmed: true,
      emailConfirmationToken: null
    })
  }

  public async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await this.db.findUserById(id)
    if (!user) {
      throw new CoreError('USER_NOT_FOUND')
    }

    const ok = await passwords.check(user.email!, oldPassword, user.password!)
    if (!ok) {
      throw new CoreError('INVALID_CREDENTIALS')
    }
    const hash = await passwords.hash(user.email!, newPassword)

    await this.db.updateUser({
      id: user.id,
      password: hash
    })
  }

  public async confirmEmail(token: string, password: string) {
    const user = await this.db.findUserByEmailConfirmationToken(token)
    if (!user) {
      throw new CoreError('EMAIL_CONFIRMATION_TOKEN_NOT_FOUND')
    }

    await this.db.updateUser({
      id: user.id,
      emailConfirmed: true,
      emailConfirmationToken: null
    })
  }

  public async useRecoveryCode(userId: string, token: string) {
    const codes = await this.db.findRecoveryCodesByUserId(userId)
    this.crypto.decryptRecovery(codes)

    const toUse = codes.find(code => {
      return code.decrypted!.toUpperCase() === token.toUpperCase() && !code.used
    })

    if (toUse) {
      return this.db.useRecoveryCode(userId, toUse.code)
    } else {
      throw new CoreError('RECOVERY_CODE_NOT_FOUND')
    }
  }

  private normalizeEmail(email: string) {
    return email.toLowerCase()
  }

  private createToken() {
    return this.jwt.sign({ code: this.crypto.random() }, { expiresIn: '24h' })
  }
}
