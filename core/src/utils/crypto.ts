import * as crypto from 'crypto'

import { IRecoveryCode } from '../types'

const separator = '.'
const encoding = 'hex'

export default class Crypto {
  private key: string
  private algorithm: string

  constructor(key: string, algorithm: string = 'aes-256-gcm') {
    this.key = key
    this.algorithm = algorithm
  }

  public async encrypt(text: string) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    let encrypted = cipher.update(text, 'utf8', encoding)
    encrypted += cipher.final(encoding)
    const tag = cipher.getAuthTag()
    return [encrypted, tag.toString(encoding), iv.toString(encoding)].join(
      separator
    )
  }

  public async decrypt(encrypted: string) {
    const [content, tag, iv] = encrypted.split(separator)
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      new Buffer(iv, encoding)
    )
    decipher.setAuthTag(new Buffer(tag, encoding))
    let dec = decipher.update(content, encoding, 'utf8')
    dec += decipher.final('utf8')
    return dec
  }

  public async decryptRecovery(recoveryCodes: IRecoveryCode[]) {
    await Promise.all(
      recoveryCodes.map(encrypted => {
        return this.decrypt(encrypted.code).then(decrypted => {
          encrypted.decrypted = decrypted
          return encrypted
        })
      })
    )
  }

  public random(length: number = 16) {
    return crypto.randomBytes(length).toString('hex')
  }
}
