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

  describe('Test hash pre-generated with the old scrypt library', () => {
    const email = 'jens.mikkelsen@clevertech.biz';
    const pass = '1234';
    const oldHash = 'c2NyeXB0AA4AAAAIAAAAAeIvsdqRM0lgRDuV/T9zYvjKPjzbui8k+E0zFlbSmGur6dH0AeOF391KXtIksf6wEr24GCZMCD9+jNbGpjTNlVp+nXZHnxWpur1inMVyrDTr';

    it('check validates the old hash', async () => {
      const ok = await passwords.check(email, pass, oldHash);
      expect(ok).toBeTruthy();
    })

    it('returns false if the hash is invalid', async () => {
      const ok = await passwords.check(email, 'wrong password', oldHash);
      expect(ok).toBeFalsy();
    })
  })
})
