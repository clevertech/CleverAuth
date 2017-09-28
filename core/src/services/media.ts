import { IMediaService, IMediaOptions } from '../core'

const mediaService = require('pnp-media-service')

export default class DefaultMediaService implements IMediaService {
  private mediaServer: any

  constructor(config: any) {
    this.mediaServer = mediaService.startServer(config)
  }

  public async upload(info: IMediaOptions): Promise<{ url: string }> {
    const port = this.mediaServer.address().port
    const url = `http://127.0.0.1:${port}/media/upload`
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(info),
      headers: { 'Content-Type': 'application/json' }
    })
    const json = await response.json()
    if (response.status < 400) return json
    return Promise.reject(new Error(json.error))
  }
}
