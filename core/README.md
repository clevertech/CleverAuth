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
  Validations
} from '@clevertech/auth-core'

const db = new MongoAdapter('<uri>')
const db = new KnexAdapter({
  // knex config here
})

const core = new Core({
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
  numberOfRecoverCodes: 10
})
```
