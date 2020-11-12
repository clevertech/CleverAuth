import * as crypto from 'crypto'
import { IDatabaseAdapter } from '../src/database/adapter'
import KnexAdapter from '../src/database/knex'
import MongoAdapter from '../src/database/mongo'

const mysql = new KnexAdapter({
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'cleverauth-test',
    password: 'cleverauth-test',
    database: 'cleverauth-test'
  }
})

const postgresql = new KnexAdapter({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: 5432,
    user: 'cleverauth-test',
    password: 'cleverauth-test',
    database: 'cleverauth-test'
  }
})

const mongo = new MongoAdapter('mongodb://127.0.0.1:27017/cleverauth-test')

const adapters: { [index: string]: IDatabaseAdapter } = {
  mysql,
  postgresql,
  mongo
}

const randomId = crypto.randomBytes(16).toString('hex')

const USER_UNDEFINED = 'User is not defined';

describe('Database adapter', () => {

  describe('Mongo adapter specific', () => {
    const adapter = adapters.mongo
    const adapterName = 'mongo';

    describe('Before init() calls', () => {
      it(`${adapterName} insertUser() should fail`, async () => {
        expect(
          adapter.insertUser({
            email: '',
            emailConfirmationToken: ''
          })
        ).rejects.toThrow();
      });
      it(`${adapterName} insertProvider() should fail`, async () => {
        expect(
          adapter.insertProvider({
            userId: '',
            login: '',
            data: { }
          })
        ).rejects.toThrow();
      })
      it(`${adapterName} updateUser() should fail`, async () => {
        expect(
          adapter.updateUser({ id: '', emailConfirmed: true })
        ).rejects.toThrow();
      })
      it(`${adapterName} findUserByEmail() should fail`, async () => {
        expect(
          adapter.findUserByEmail('')
        ).rejects.toThrow();
      })
      it(`${adapterName} findUserById() should fail`, async () => {
        expect(
          adapter.findUserById('')
        ).rejects.toThrow();
      })
      it(`${adapterName} findUserByProviderLogin() should fail`, async () => {
        expect(
          adapter.findUserByProviderLogin('')
        ).rejects.toThrow();
      })
    });
  });

  Object.keys(adapters).forEach(adapterName => {
    const adapter = adapters[adapterName]
    let userId: string
    let emailConfirmationToken: string

    it(`${adapterName} init()`, async () => {
      await adapter.init()
    })

    it(`${adapterName} insertUser()`, async () => {
      userId = await adapter.insertUser({
        email: `test+${randomId}@example.com`,
        emailConfirmationToken: `token${randomId}`
      })
    })

    it(`${adapterName} insertProvider()`, async () => {
      await adapter.insertProvider({
        userId,
        login: `login${randomId}`,
        data: { someKey: 'placeholder string' }
      })
    })
    it(`${adapterName} updateUser()`, async () => {
      await adapter.updateUser({ id: userId, emailConfirmed: true })
      const user = await adapter.findUserById(userId)
      if(!user) throw Error(USER_UNDEFINED);
      expect(user.emailConfirmed).toEqual(true)
    })

    it(`${adapterName} findUserByEmail()`, async () => {
      const user = await adapter.findUserByEmail(`test+${randomId}@example.com`)
      if(!user) throw Error(USER_UNDEFINED);
      expect(user.id).toEqual(userId)
      expect(user.email).toEqual(`test+${randomId}@example.com`)
      if(user.emailConfirmationToken) {
        emailConfirmationToken = user.emailConfirmationToken
      }
    })

    it(`${adapterName} findUserById()`, async () => {
      const user = await adapter.findUserById(userId)
      if(!user) throw Error(USER_UNDEFINED);
      expect(user.id).toEqual(userId)
      expect(user.email).toEqual(`test+${randomId}@example.com`)
      expect(user.emailConfirmationToken).toEqual(emailConfirmationToken)
    })

    it(`${adapterName} findUserByProviderLogin()`, async () => {
      const user = await adapter.findUserByProviderLogin(`login${randomId}`)
      if(!user) throw Error(USER_UNDEFINED);
      expect(user.id).toEqual(userId)
      expect(user.email).toEqual(`test+${randomId}@example.com`)
      expect(user.emailConfirmationToken).toEqual(emailConfirmationToken)
    })
  })
})
