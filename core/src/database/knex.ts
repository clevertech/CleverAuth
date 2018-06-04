import * as knex from 'knex'
import { clone, omit, once } from 'lodash'
import * as uuid from 'uuid/v4'
import * as constants from '../constants'
import { IProvider, IRecoveryCode, IUser, IUserUpdate } from '../types'
import { IDatabaseAdapter } from './adapter'

const fieldNames = constants.availableFields.map(field => field.name)
const last = (result: any) => (Array.isArray(result) ? result[result.length - 1] : result)

export default class KnexAdapter implements IDatabaseAdapter {
  private db: knex
  private serializeJSON: boolean

  constructor(config: knex.Config) {
    const cloned = clone(config)
    if (config.client === 'mysql') {
      ;(config.connection as any).typeCast = (field: any, next: any) => {
        // Retrieve booleans from mysql
        if (field.type === 'TINY' && field.length === 1) {
          return field.string() === '1' // 1 = true, 0 = false
        }
        return next()
      }
    }
    this.db = knex(cloned)
    this.serializeJSON = config.client === 'mysql'
  }

  public async init() {
    const authUsersExists = await this.db.schema.hasTable('auth_users')
    if (!authUsersExists) {
      await this.db.schema.createTableIfNotExists(
        'auth_users',
        once((table: knex.TableBuilder) => {
          table.uuid('id').primary()
          table
            .string('email')
            .notNullable()
            .unique()
          table.string('twofactor').nullable()
          table.string('password').nullable()
          table
            .boolean('emailConfirmed')
            .notNullable()
            .defaultTo(false)
          table
            .text('emailConfirmationToken')
            .nullable()
            .unique()
          table.string('termsAndConditions').nullable()
          table.timestamps()
        })
      )
    }

    const missing: string[] = []
    for (const fieldName of fieldNames) {
      await this.db.schema.hasColumn('auth_users', fieldName).then(exists => {
        if (!exists) missing.push(fieldName)
        return missing
      })
    }

    if (missing.length > 0) {
      await this.alterTable('auth_users', (table: knex.TableBuilder) => {
        missing.forEach(fieldName => table.string(fieldName))
      })
    }

    await this.db.schema.hasTable('auth_providers').then(tableExists => {
      return tableExists
        ? Promise.resolve()
        : this.createTableIfNotExists(
            'auth_providers',
            once((table: knex.TableBuilder) => {
              table.uuid('userId').notNullable()
              table
                .foreign('userId')
                .references('auth_users.id')
                .onDelete('cascade')
              table
                .string('login')
                .notNullable()
                .unique()
              table.json('data').notNullable()
              table.timestamps()
            })
          )
    })

    await this.db.schema.hasTable('auth_sessions').then(tableExists => {
      return tableExists
        ? Promise.resolve()
        : this.createTableIfNotExists(
            'auth_sessions',
            once((table: knex.TableBuilder) => {
              table.uuid('userId').notNullable()
              table
                .foreign('userId')
                .references('auth_users.id')
                .onDelete('cascade')
              table.string('userAgent').notNullable()
              table.string('ip').notNullable()
              table.timestamps()
            })
          )
    })

    await this.db.schema.hasTable('auth_recovery_codes').then(tableExists => {
      return tableExists
        ? Promise.resolve()
        : this.createTableIfNotExists(
            'auth_recovery_codes',
            once((table: knex.TableBuilder) => {
              table.uuid('userId').notNullable()
              table
                .foreign('userId')
                .references('auth_users.id')
                .onDelete('cascade')
              table.string('code').notNullable()
              table
                .boolean('used')
                .notNullable()
                .defaultTo(false)
            })
          )
    })

    await this.addColumn('auth_users', 'twofactorSecret', table => table.string('twofactorSecret'))
    await this.addColumn('auth_users', 'twofactorPhone', table => table.string('twofactorPhone'))
  }

  async findUserByEmail(email: string): Promise<IUser | undefined> {
    return this.db('auth_users')
      .where({ email })
      .then(last)
  }

  async findUserById(id: string): Promise<IUser | undefined> {
    return this.db('auth_users')
      .where({ id })
      .select()
      .then(last)
  }

  async findUserByProviderLogin(login: string): Promise<IUser | undefined> {
    return this.db('auth_providers')
      .where({ login })
      .leftJoin('auth_users', 'auth_providers.userId', 'auth_users.id')
      .then(last)
  }

  async findRecoveryCodesByUserId(userId: string): Promise<IRecoveryCode[]> {
    return this.db('auth_recovery_codes').where({ userId })
  }

  async insertRecoveryCodes(userId: string, codes: string[]): Promise<IRecoveryCode[]> {
    await this.db.transaction(trx => {
      return this.db('auth_recovery_codes')
        .where({ userId })
        .del()
        .then(res => {
          return Promise.all(
            codes.map(code => {
              return this.db('auth_recovery_codes')
                .transacting(trx)
                .insert({ userId, code })
            })
          )
        })
        .then(trx.commit)
        .catch(err => {
          trx.rollback()
          throw err
        })
    })
    return codes.map(code => ({ code, used: false }))
  }

  async useRecoveryCode(userId: string, code: string): Promise<boolean> {
    return this.db('auth_recovery_codes')
      .where({ userId, code: code.toLowerCase(), used: false })
      .update({ used: true })
      .then(updateCount => !!updateCount)
  }

  async insertUser(user: IUser): Promise<string> {
    user = omit(user, ['id', '_id'])
    const userId = uuid()
    user.id = userId
    return this.db('auth_users')
      .insert(user)
      .then(res => {
        return userId
      })
  }

  async updateUser(user: IUserUpdate): Promise<void> {
    return this.db('auth_users')
      .where('id', '=', user.id!)
      .update(user)
  }

  async insertProvider(provider: IProvider): Promise<void> {
    if (this.serializeJSON) {
      provider.data = JSON.stringify(provider.data)
    }
    return this.db('auth_providers').insert(provider)
  }

  private createTableIfNotExists(tableName: string, callback: (table: knex.TableBuilder) => void) {
    callback = once(callback)
    return this.db.schema.hasTable(tableName).then(tableExists => {
      return this.db.schema.createTableIfNotExists(
        tableName,
        table => (!tableExists ? callback(table) : void 0)
      )
    })
  }

  private addColumn(
    table: string,
    columnName: string,
    callback: (t: knex.AlterTableBuilder) => void
  ) {
    return this.db.schema
      .hasColumn(table, columnName)
      .then(exists => !exists && this.alterTable(table, callback))
  }

  private alterTable(table: string, callback: (t: knex.AlterTableBuilder) => void) {
    return (this.db.schema as any).alterTable(table, once(callback))
  }
}
