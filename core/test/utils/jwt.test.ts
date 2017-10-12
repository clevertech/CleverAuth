import JWT from '../../src/utils/jwt'

const jwt1 = new JWT('HS256', 'shhh', 'shhh')

describe('JWT', () => {
  it('sign and verify work as expected', async () => {
    const payload = { hello: 'world' }
    const jwt = await jwt1.sign(payload)
    const original = await jwt1.verify(jwt)
    expect(original.hello).toEqual(payload.hello)
  })
  it('sign rejects on invalid params', async () => {
    expect(jwt1.sign(undefined)).rejects.toHaveProperty('message', 'payload is required')
  })
  it('verify rejects on invalid params', async () => {
    expect(jwt1.verify(undefined)).rejects.toHaveProperty('message', 'jwt must be provided')
  })
})
