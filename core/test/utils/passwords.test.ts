import DefaultPasswordsService from '../../src/utils/passwords'

const passwords = new DefaultPasswordsService()

describe('Passwords', () => {
  it('hash and check work as epexted', async () => {
    const email = 'user@example.com'
    const pass = 'dummypassword'
    const hash = await passwords.hash(email, pass)
    const ok = await passwords.check(email, pass, hash)
    expect(ok).toBeTruthy()
  })
  describe('#check', () => {
    it('returns false if the hash is invalid', async () => {
      const email = 'user@example.com'
      const pass = 'dummypassword'
      const hash = await passwords.hash(email, pass + 'x')
      const ok = await passwords.check(email, pass, hash)
      expect(ok).toBeFalsy()
    })
  })
  describe('#invalidHash', () => {
    it('returns a valid hash but with invalid parameters', async () => {
      const hash = await passwords.invalidHash()
      expect(hash).toBeTruthy()
    })
  })
})
