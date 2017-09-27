const scrypt = require('scrypt')
const scryptParameters = scrypt.paramsSync(0.1)

export const hash = (email: string, pass: string): Promise<string> => {
  pass = email + '#' + pass
  return scrypt
    .kdf(pass, scryptParameters)
    .then((result: Buffer) => result.toString('base64'))
}

export const check = (
  email: string,
  pass: string,
  hash: string
): Promise<boolean> => {
  pass = email + '#' + pass
  return scrypt.verifyKdf(Buffer.from(hash, 'base64'), pass)
}

export const invalidHash = () => {
  return hash('invalidEmail', 'anypasswordyoucanimagine')
}
