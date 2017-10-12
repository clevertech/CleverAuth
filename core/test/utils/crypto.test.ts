import Crypto from '../../src/utils/crypto'
import { IRecoveryCode } from '../../src/types'

const key = '2a7327fb7805a03e1344be5228019be5'
const crypto = new Crypto(key)

describe('Crypto', () => {
  it('encrypt and decrypt work as expected', async () => {
    const plain = 'hello world'
    const encrypted = await crypto.encrypt(plain)
    const orignal = await crypto.decrypt(encrypted)
    expect(orignal).toEqual(plain)
  })
  it('decrypts recovery codes', async () => {
    const codes: IRecoveryCode[] = [
      {
        code: await crypto.encrypt('1234'),
        used: false
      },
      {
        code: await crypto.encrypt('7777'),
        used: false
      }
    ]
    await crypto.decryptRecovery(codes)
    expect(codes[0].decrypted).toEqual('1234')
    expect(codes[1].decrypted).toEqual('7777')
  })
  it('sign and verify work as expected', async () => {
    const random = crypto.random()
    expect(random).toHaveLength(32)
  })
})
