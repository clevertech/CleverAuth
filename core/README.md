# CleverAuth Core

```javascript
import {
  Core,
  KnexAdapter,
  MongoAdapter,
  DefaultEmailService,
  DefaultMediaService,
  Crypto,
  JWT,
  Validations,
  TwilioSMSService
} from '@clevertech/auth-core'

const db = new MongoAdapter('<uri>')
const db = new KnexAdapter({
  // knex config here
})

const sms = new TwilioSMSService({
  accountSid: '',
  authToken: '',
  numberFrom: ''
})

const core = new Core({
  projectName: '<projectName>',
  db,
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
  sms,
  numberOfRecoverCodes: 10
})
```
