import {
  Core,
  KnexAdapter,
  MongoAdapter,
  DefaultEmailService,
  DefaultMediaService,
  Crypto,
  JWT,
  Validations
} from '../src/library'

const core = new Core({
  db: new KnexAdapter({}),
  email: new DefaultEmailService({
    projectName: '',
    confirmEmailURL: '',
    requestResetPasswordURL: '',
    resetPasswordURL: '',
    emailServiceConfig: {
      // config for pnp-email-service
    }
  }),
  media: new DefaultMediaService(
    {
      // config for pnp-media-service
    }
  ),
  crypto: new Crypto('<key>', '<algorithm> = aes-256-gcm'),
  jwt: new JWT(
    '<algorithm>',
    '<secretOrPrivateKey>',
    '<secretOrPublicKey>',
    {
      // default options: see https://github.com/auth0/node-jsonwebtoken#usage
    }
  ),
  validations: new Validations(['name', 'company'], true),
  numberOfRecoverCodes: 10
})

console.log('core', core)

/**
 * Dummy test
 */
describe('Dummy test', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  it('DummyClass is instantiable', () => {
    expect(new DummyClass()).toBeInstanceOf(DummyClass)
  })
})
