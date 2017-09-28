import * as Joi from 'joi'
import { availableFields, IField } from './constants'

type IConstraints = {
  [index: string]: Joi.SchemaLike
}

export default class Validations {
  public readonly signupFields: IField[]
  public readonly termsAndConditions: boolean

  constructor(signupFields: string[], termsAndConditions: boolean) {
    this.signupFields = signupFields
      .map(name => availableFields.find(field => field.name === name)!)
      .filter(Boolean)
    this.termsAndConditions = termsAndConditions
  }

  public forms(provider: string) {
    const forms = {
      register: {
        fields: {
          email: ['email', 'empty']
        }
      },
      signin: {
        fields: {
          email: ['email', 'empty'],
          password: ['empty']
        }
      },
      resetpassword: {
        fields: {
          email: ['email', 'empty']
        }
      },
      reset: {
        fields: {
          password: ['empty']
        }
      },
      changepassword: {
        fields: {
          oldpassword: ['empty'],
          newpassword: ['empty']
        }
      },
      changeemail: {
        fields: {
          email: ['email', 'empty'],
          password: ['empty']
        }
      }
    } as any

    const registerFields = forms.register.fields
    if (!provider) registerFields.password = ['empty']
    if (this.termsAndConditions) {
      registerFields.termsAndConditions = ['checked']
    }
    for (const field of this.signupFields) {
      registerFields[field.name] = field.type === 'text' ? ['empty'] : []
    }
    return forms
  }

  public schema(provider: string, formName: string) {
    const { fields } = this.forms(provider)[formName]
    const keys = Object.keys(fields).reduce(
      (keys, key) => {
        const arr = fields[key]
        let constraint = Joi.string().trim()
        arr.indexOf('empty') >= 0
          ? (constraint = constraint.required())
          : (constraint = constraint.optional())
        if (arr.indexOf('email') >= 0) constraint.email().lowercase()
        keys[key] = constraint
        return keys
      },
      {} as IConstraints
    )
    return Joi.object().keys(keys)
  }

  public validate(provider: string, formName: string, values: any) {
    values = Object.assign({}, values)
    delete values['g-recaptcha-response']
    const schema = this.schema(provider, formName)
    return Joi.validate(values, schema, { abortEarly: false })
  }
}
