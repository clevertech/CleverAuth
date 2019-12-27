import { IPasswordService } from '../core'

const bcrypt = require('bcrypt')

export default class DefaultPasswordsService implements IPasswordService {
  public hash(email: string, pass: string): Promise<string> {
    pass = email + '#' + pass
    const saltRounds = 10
    const hash = bcrypt.hashSync(pass, saltRounds)
    return hash
  }

  public async check(email: string, pass: string, hash?: string | undefined): Promise<boolean> {
    pass = email + '#' + pass
    return bcrypt.compareSync(pass, hash || (await this.invalidHash()))
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
