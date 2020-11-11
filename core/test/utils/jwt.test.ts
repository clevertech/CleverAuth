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
    const value: unknown = undefined;
    expect(jwt1.sign(value as string)).rejects.toHaveProperty('message', 'payload is required')
  })
  it('verify rejects on invalid params', async () => {
    const value: unknown = undefined;
    expect(jwt1.verify(value as string)).rejects.toHaveProperty('message', 'jwt must be provided')
  })
})
