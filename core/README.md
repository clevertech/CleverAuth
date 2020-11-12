
# CleverAuth Core

Generic auth library for Clevertech.


## Testing

You have to run the tests with node `v10` or `v12`. Node `v14` has a known issue with older `pg`
clients.

    docker-compose -f test/docker-compose.yml up -d
    npm run test


## Example

```javascript
import {
  Core,
  KnexAdapter,
  MongoAdapter,
  DefaultEmailService,
  Crypto,
  JWT,
  Validations,
  TwilioSMSService
} from '@clevertech.biz/auth-core'

const db = new MongoAdapter('<uri>')
const db = new KnexAdapter({
  // knex config here
})
const sms = new TwilioSMSService(
  '<accountSid>',
  '<authToken>',
  '<numberFrom>'
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
  crypto: new Crypto('<key>', '<algorithm> = aes-256-gcm'),
  jwt: new JWT('<algorithm>', '<secretOrPrivateKey>', '<secretOrPublicKey>', {
    // default options: see https://github.com/auth0/node-jsonwebtoken#usage
  }),
  validations: new Validations(['name', 'company'], true),
  sms,
  numberOfRecoverCodes: 10
})
```
