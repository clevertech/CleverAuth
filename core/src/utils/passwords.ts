const scrypt = require('scrypt')
const scryptParameters = scrypt.paramsSync(0.1)

/**
 * This generates an invalid hash because the email address is invalid.
 * If somebody attempts to login with an email address that does not exist, we don't have a hash
 * to compare with. But if we immediately return with an error the attacker knows that the are
 * no accounts with that email address. To prevent a timing attack we always check against
 * a hash. If we don't have a hash we use one that we always know it is not valid.
 *
 * See https://en.wikipedia.org/wiki/Timing_attack
 */
const invalidHash = () => {
  return hash('invalidEmail', 'anypasswordyoucanimagine')
}

export const hash = (email: string, pass: string): Promise<string> => {
  pass = email + '#' + pass
  return scrypt
    .kdf(pass, scryptParameters)
    .then((result: Buffer) => result.toString('base64'))
}

export const check = async (
  email: string,
  pass: string,
  hash?: string
): Promise<boolean> => {
  pass = email + '#' + pass
  return scrypt.verifyKdf(Buffer.from(hash || await invalidHash(), 'base64'), pass)
}
