import { omit } from 'lodash'
import * as mongo from 'mongodb'
import { IProvider, IRecoveryCode, IUser, IUserUpdate } from '../types'
import { IDatabaseAdapter } from './adapter'

export default class MongoAdapter implements IDatabaseAdapter {
  private databaseURL: string
  private db: mongo.Db

  constructor(databaseURL: string) {
    this.databaseURL = databaseURL
  }

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      mongo.MongoClient.connect(this.databaseURL, (err, connection) => {
        if (err) return reject(err)
        this.db = connection
        resolve()
      })
    })
  }

  public async findUserByEmail(email: string): Promise<IUser | undefined> {
    return this.normalize(await this.db.collection('auth_users').findOne({ email }))
  }

  public async findUserByEmailConfirmationToken(
    emailConfirmationToken: string
  ): Promise<IUser | undefined> {
    return this.normalize(
      await this.db.collection('auth_users').findOne({ emailConfirmationToken })
    )
  }

  public async findUserById(id: string): Promise<IUser | undefined> {
    return this.normalize(
      await this.db.collection('auth_users').findOne({ _id: new mongo.ObjectID(id) })
    )
  }

  public async findUserByProviderLogin(login: string): Promise<IUser | undefined> {
    const provider = await this.db.collection('auth_providers').findOne({ login })
    if (!provider) {
      return undefined
    }
    return this.normalize(
      await this.db.collection('auth_users').findOne({ _id: new mongo.ObjectID(provider.userId) })
    )
  }

  public findRecoveryCodesByUserId(userId: string): Promise<IRecoveryCode[]> {
    return this.db
      .collection('auth_recovery_codes')
      .find({ userId })
      .toArray()
  }

  public async insertRecoveryCodes(userId: string, codes: string[]): Promise<IRecoveryCode[]> {
    await this.db.collection('auth_recovery_codes').deleteMany({ userId })

    await Promise.all(
      codes.map(code => {
        return this.db.collection('auth_recovery_codes').insertOne({ userId, code, used: false })
      })
    )
    return codes.map(code => ({ code, used: false }))
  }

  public async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    const res = await this.db
      .collection('auth_recovery_codes')
      .updateOne({ userId, code: code.toLowerCase(), used: false }, { $set: { used: true } })
    return !!res.result.nModified
  }

  public async insertUser(user: IUser): Promise<string> {
    const res = await this.db.collection('auth_users').insertOne(user)
    return res.insertedId.toHexString()
  }

  public async updateUser(user: IUserUpdate): Promise<void> {
    const res = await this.db
      .collection('auth_users')
      .update({ _id: new mongo.ObjectID(user.id!) }, { $set: omit(user, 'id') })
    return res.result.nModified
  }

  public async insertProvider(provider: IProvider): Promise<void> {
    await this.db.collection('auth_providers').insertOne(provider)
    // return res.insertedId.toHexString()
  }

  private normalize(obj: any) {
    if (!obj) return obj
    const id = obj._id
    if (!id) return obj
    delete obj._id
    obj.id = id.toHexString()
    return obj
  }
}
