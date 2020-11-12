import { omit } from 'lodash';
import * as mongo from 'mongodb';
import { IProvider, IRecoveryCode, IUser, IUserUpdate } from '../types';
import { IDatabaseAdapter } from './adapter';

const UNINITIALIZED_ADAPTER = 'Mongo adapter was not initialized';

export default class MongoAdapter implements IDatabaseAdapter {
  private databaseURL: string
  private db: mongo.Db | undefined

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
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    return this.normalize(await this.db.collection('auth_users').findOne({ email }))
  }

  public async findUserById(id: string): Promise<IUser | undefined> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    return this.normalize(
      await this.db.collection('auth_users').findOne({ _id: new mongo.ObjectID(id) })
    )
  }

  public async findUserByProviderLogin(login: string): Promise<IUser | undefined> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    const provider = await this.db.collection('auth_providers').findOne({ login })
    if (!provider) {
      return undefined
    }
    return this.normalize(
      await this.db.collection('auth_users').findOne({ _id: new mongo.ObjectID(provider.userId) })
    )
  }

  public findRecoveryCodesByUserId(userId: string): Promise<IRecoveryCode[]> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    return this.db
      .collection('auth_recovery_codes')
      .find({ userId })
      .toArray()
  }

  public async insertRecoveryCodes(userId: string, codes: string[]): Promise<IRecoveryCode[]> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    await this.db.collection('auth_recovery_codes').deleteMany({ userId })

    await Promise.all(
      codes.map(code => {
        if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
        return this.db.collection('auth_recovery_codes').insertOne({ userId, code, used: false })
      })
    )
    return codes.map(code => ({ code, used: false }))
  }

  public async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    const res = await this.db
      .collection('auth_recovery_codes')
      .updateOne({ userId, code: code.toLowerCase(), used: false }, { $set: { used: true } })
    return !!res.result.nModified
  }

  public async insertUser(user: IUser): Promise<string> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    const res = await this.db.collection('auth_users').insertOne(user)
    return res.insertedId.toHexString()
  }

  public async updateUser(user: IUserUpdate): Promise<void> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
    const res = await this.db
      .collection('auth_users')
      .update({ _id: new mongo.ObjectID(user.id!) }, { $set: omit(user, 'id') })
    return res.result.nModified
  }

  public async insertProvider(provider: IProvider): Promise<void> {
    if(!this.db) throw new Error(UNINITIALIZED_ADAPTER);
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
