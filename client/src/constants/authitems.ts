const SignUpItemLists: Array<{
  name: 'email' | 'password' | 'username' | 'fullname'
  type: string
  placeholder: string
}> = [
  {
    name: 'username',
    type: 'text',
    placeholder: 'username'
  },
  {
    name: 'email',
    type: 'email',
    placeholder: 'email'
  },
  {
    name: 'password',
    type: 'password',
    placeholder: 'password'
  },
  {
    name: 'fullname',
    type: 'text',
    placeholder: 'fullname'
  }
]

const SignInItemLists: Array<{
  name: 'password' | 'username'
  type: string
  placeholder: string
}> = [
  {
    name: 'username',
    type: 'text',
    placeholder: 'username'
  },
  {
    name: 'password',
    type: 'password',
    placeholder: 'password'
  }
]

export { SignUpItemLists, SignInItemLists }
