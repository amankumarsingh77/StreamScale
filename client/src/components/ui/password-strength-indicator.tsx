import React from 'react'
import { Progress } from '@/components/ui/progress'

interface PasswordStrengthIndicatorProps {
  password: string
}

const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password }) => {
  const calculateStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.match(/[a-z]+/)) strength += 25
    if (password.match(/[A-Z]+/)) strength += 25
    if (password.match(/[0-9]+/)) strength += 25
    if (password.match(/[$@#&!]+/)) strength += 25
    return Math.min(100, strength)
  }

  const strength = calculateStrength(password)

  const getColor = (strength: number): string => {
    if (strength < 33) return 'bg-red-500'
    if (strength < 66) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="w-full mt-2">
      <Progress
        value={strength}
        indicatorColor={getColor(strength)}
        className={'h-2 '}
      />
      <p className="text-sm mt-1 text-gray-600">
        {strength < 33 && 'Weak'}
        {strength >= 33 && strength < 66 && 'Moderate'}
        {strength >= 66 && 'Strong'}
      </p>
    </div>
  )
}

export default PasswordStrengthIndicator
