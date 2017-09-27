export interface IField {
  name: string
  type: string
  icon?: string
  description: string
  unique?: boolean
}

export const availableFields: IField[] = [
  {
    name: 'name',
    type: 'text',
    icon: 'user',
    description: 'Full name'
  },
  {
    name: 'firstName',
    type: 'text',
    icon: 'user',
    description: 'First name'
  },
  {
    name: 'lastName',
    type: 'text',
    icon: 'user',
    description: 'Last name'
  },
  {
    name: 'company',
    type: 'text',
    icon: 'building',
    description: 'Company name'
  },
  {
    name: 'address',
    type: 'text',
    icon: 'map',
    description: 'Address'
  },
  {
    name: 'city',
    type: 'text',
    icon: 'map',
    description: 'City'
  },
  {
    name: 'state',
    type: 'text',
    icon: 'map',
    description: 'State'
  },
  {
    name: 'zip',
    type: 'text',
    icon: 'map',
    description: 'Zip code'
  },
  {
    name: 'country',
    type: 'text',
    icon: 'map',
    description: 'Country'
  },
  {
    name: 'username',
    type: 'text',
    icon: 'user',
    description: 'Username',
    unique: true
  },
  {
    name: 'image',
    type: 'image',
    description: 'User image'
  }
]
