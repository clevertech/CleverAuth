import * as jwt from 'jsonwebtoken'

export default class JWT {
  private defaultOptions: jwt.SignOptions
  private algorithm: string
  private secretOrPrivateKey: string
  private secretOrPublicKey: string

  constructor(
    options: jwt.SignOptions,
    algorithm: string,
    secretOrPrivateKey: string,
    secretOrPublicKey: string
  ) {
    this.defaultOptions = options
    this.algorithm = algorithm
    this.secretOrPrivateKey = secretOrPrivateKey
    this.secretOrPublicKey = secretOrPublicKey
  }

  public sign(
    payload: string | object | Buffer,
    options?: jwt.SignOptions
  ): Promise<string> {
    const opts = Object.assign({}, this.defaultOptions, options)
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.secretOrPrivateKey, opts, (err, token) => {
        err ? reject(err) : resolve(token)
      })
    })
  }

  public verify(token: string, options?: jwt.VerifyOptions): Promise<any> {
    const opts = Object.assign({}, { algorithm: this.algorithm }, options)
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secretOrPublicKey, opts, (err, decoded) => {
        err ? reject(err) : resolve(decoded)
      })
    })
  }
}
