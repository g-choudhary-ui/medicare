import React from 'react'
import { Flame } from 'lucide-react'

export default function StreakCounter({ streak = 0, size = 'normal' }) {
  const isLarge = size === 'large'

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2 ${
        isLarge ? 'p-6 flex-col justify-center text-center w-full' : ''
      }`}
      role="status"
      aria-label={`Current adherence streak is ${streak} days`}
    >
      <div className={`text-amber-500 animate-fire flex items-center justify-center ${isLarge ? 'text-5xl mb-1' : 'text-2xl'}`}>
        🔥
      </div>
      <div className={isLarge ? 'space-y-1' : 'flex items-baseline gap-1'}>
        <span className={`font-black text-amber-900 ${isLarge ? 'text-4xl block' : 'text-2xl'}`}>
          {streak}
        </span>
        <span className={`font-semibold text-amber-700 ${isLarge ? 'text-base block' : 'text-sm'}`}>
          {streak === 1 ? 'day streak' : 'days streak'}
        </span>
      </div>
    </div>
  )
}
