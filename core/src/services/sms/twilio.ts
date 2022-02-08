import * as querystring from 'querystring'

import fetch from 'node-fetch'

import { ISMSService } from '../../core'
import { IUser } from '../../types'

export default class TwilioSMSService implements ISMSService {
  private accountSid: string
  private authToken: string
  private numberFrom: string

  constructor(accountSid: string, authToken: string, numberFrom: string) {
    this.accountSid = accountSid
    this.authToken = authToken
    this.numberFrom = numberFrom
  }

  send2FAConfigurationToken(
    projectName: string,
    user: IUser,
    phone: string,
    token: string
  ) {
    this.sendSMS(phone, `${token} is your ${projectName} verification code`)
  }

  protected async sendSMS(numberTo: string, text: string) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this
      .accountSid}/Messages.json`
    const body = { To: numberTo, From: this.numberFrom, Body: text }
    const res = await fetch(url, {
      method: 'POST',
      body: querystring.stringify(body),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          new Buffer(this.accountSid + ':' + this.authToken).toString('base64')
      }
    })
    try {
      const json = await res.json()
      if (res.status >= 400) {
        throw new Error(
          `Twilio returned ${res.status}. ${json.code} ${json.message} ${json.more_info}`
        )
      }
    } catch (err) {
      throw new Error(
        `Twilio returned ${res.status}. ${err.message || String(err)}`
      )
    }
  }
}
