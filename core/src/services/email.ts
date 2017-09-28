import * as querystring from 'querystring'
import fetch from 'node-fetch'

import { IEmailService } from '../core'
import { IUser, IUserAgent } from '../types'

const emailService = require('pnp-email-service')

interface IEmailOptions {
  to: string
}

export interface IDefaultEmailServiceConfig {
  emailServiceConfig: any
  projectName: string
  confirmEmailURL: string
  requestResetPasswordURL: string
  resetPasswordURL: string
}

export default class DefaultEmailService implements IEmailService {
  private emailServer: any
  private projectName: string
  private confirmEmailURL: string
  private requestResetPasswordURL: string
  private resetPasswordURL: string

  constructor(config: IDefaultEmailServiceConfig) {
    this.projectName = config.projectName
    this.emailServer = emailService.startServer(config.emailServiceConfig)
  }

  public sendWelcomeEmail(
    user: IUser,
    client: IUserAgent,
    emailConfirmationToken: string
  ): Promise<void> {
    const templateOptions = {
      user,
      name: this.userName(user),
      client,
      projectName: this.projectName,
      link:
        this.confirmEmailURL +
        '?' +
        querystring.stringify({ emailConfirmationToken })
    }
    return this.sendEmail({
      templateName: 'welcome',
      emailOptions: { to: user.email },
      templateOptions,
      language: client.language
    })
  }

  public async sendPasswordResetHelpEmail(
    email: string,
    client: IUserAgent
  ): Promise<void> {
    const templateOptions = {
      emailAddress: email,
      client,
      projectName: this.projectName,
      tryDifferentEmailUrl: this.requestResetPasswordURL
    }
    return this.sendEmail({
      templateName: 'password_reset_help',
      emailOptions: { to: email },
      templateOptions,
      language: client.language
    })
  }

  public async sendPasswordResetEmail(
    user: IUser,
    client: IUserAgent,
    emailConfirmationToken: string
  ): Promise<void> {
    const templateOptions = {
      user,
      name: this.userName(user),
      client,
      projectName: this.projectName,
      link:
        this.resetPasswordURL +
        '?' +
        querystring.stringify({ emailConfirmationToken })
    }
    return this.sendEmail({
      templateName: 'password_reset',
      emailOptions: { to: user.email },
      templateOptions,
      language: client.language
    })
  }

  private async sendEmail(options: {
    templateName: string
    emailOptions: IEmailOptions
    templateOptions: any
    language: string
  }) {
    const port = this.emailServer.address().port
    const url = `http://127.0.0.1:${port}/email/send`
    try {
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(options),
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (err) {
      console.error(err)
    }
  }

  private userName(user: IUser) {
    return (
      user.name ||
      user.firstName ||
      user.lastName ||
      user.username ||
      user.email.substring(0, user.email.indexOf('@'))
    )
  }
}
