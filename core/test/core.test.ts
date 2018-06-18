import Core from '../src/core'

describe('Core tests', () => {

  describe('passwords', () => {

    const core = new Core({
      projectName: 'Test Core',
      db: null,
      email: null,
      crypto: null,
      jwt: null,
      validations: null,
      sms: null,
      numberOfRecoverCodes: null,
      passwords: null
    })

    test('hash', async () => {
      const email = 'email@email.com'
      const password = 'password'
      const hash = await core.hashPassword(email, password)
      const ok = await core.checkPassword(email, password, hash)
      expect(ok).toBeTruthy()
    })

    test('check', async () => {
      const email = 'email@email.com'
      const password = 'password'
      const hash = await core.hashPassword(email, password)
      const ok = await core.checkPassword(email, password, hash)
      const notOk = await core.checkPassword(email, password + 'x', hash)
      expect(ok).toBeTruthy()
      expect(notOk).toBeFalsy()
    })
  })
})
