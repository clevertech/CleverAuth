import { IPasswordService } from '../core'

const Scrypt = require('scrypt-kdf');

export default class DefaultPasswordsService implements IPasswordService {
  scryptParameters: any

  constructor(maxtime = 0.1) {
    this.scryptParameters = Scrypt.pickParams(maxtime);
  }

  public hash(email: string, pass: string): Promise<string> {
    pass = email + '#' + pass
    return Scrypt
      .kdf(pass, this.scryptParameters)
      .then((result: Buffer) => result.toString('base64'))
  }

  public async check(email: string, pass: string, hash?: string | undefined): Promise<boolean> {
    pass = email + '#' + pass
    return Scrypt.verify(Buffer.from(hash || (await this.invalidHash()), 'base64'), pass)
  }

  /**
   * This generates an invalid hash because the email address is invalid.
   * If somebody attempts to login with an email address that does not exist, we don't have a hash
   * to compare with. But if we immediately return with an error the attacker knows that the are
   * no accounts with that email address. To prevent a timing attack we always check against
   * a hash. If we don't have a hash we use one that we always know it is not valid.
   *
   * See https://en.wikipedia.org/wiki/Timing_attack
   */
  public invalidHash() {
    return this.hash('invalidEmail', 'anypasswordyoucanimagine')
  }
}
