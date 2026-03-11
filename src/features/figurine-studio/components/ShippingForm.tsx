'use client'

import { useState } from 'react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingCart } from 'lucide-react'

export interface ShippingAddress {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
}

interface ShippingFormProps {
  pricePts: number
  isSubmitting: boolean
  onSubmit: (address: ShippingAddress) => void
  onBack: () => void
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
]

const inputClass = cn(
  'w-full h-10 px-3 rounded-lg border border-border/50 bg-card/30',
  'text-sm text-foreground placeholder:text-muted-foreground/40',
  'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
  'transition-all',
)

const labelClass = 'text-[11px] font-medium text-muted-foreground/70 mb-1 block'

export function ShippingForm({ pricePts, isSubmitting, onSubmit, onBack }: ShippingFormProps) {
  const [address, setAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})

  const update = (field: keyof ShippingAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {}
    if (!address.firstName.trim()) newErrors.firstName = 'Required'
    if (!address.lastName.trim()) newErrors.lastName = 'Required'
    if (!address.address1.trim()) newErrors.address1 = 'Required'
    if (!address.city.trim()) newErrors.city = 'Required'
    if (!address.state.trim()) newErrors.state = 'Required'
    if (!address.zip.trim()) newErrors.zip = 'Required'
    if (!address.country) newErrors.country = 'Required'
    if (!address.phone.trim()) newErrors.phone = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(address)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Shipping Address
      </span>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First Name</label>
          <input
            type="text"
            className={cn(inputClass, errors.firstName && 'border-red-500/50')}
            value={address.firstName}
            onChange={e => update('firstName', e.target.value)}
            placeholder="John"
          />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input
            type="text"
            className={cn(inputClass, errors.lastName && 'border-red-500/50')}
            value={address.lastName}
            onChange={e => update('lastName', e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Address Line 1</label>
        <input
          type="text"
          className={cn(inputClass, errors.address1 && 'border-red-500/50')}
          value={address.address1}
          onChange={e => update('address1', e.target.value)}
          placeholder="123 Main Street"
        />
      </div>

      <div>
        <label className={labelClass}>Address Line 2 (Optional)</label>
        <input
          type="text"
          className={inputClass}
          value={address.address2}
          onChange={e => update('address2', e.target.value)}
          placeholder="Apt 4B"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>City</label>
          <input
            type="text"
            className={cn(inputClass, errors.city && 'border-red-500/50')}
            value={address.city}
            onChange={e => update('city', e.target.value)}
            placeholder="New York"
          />
        </div>
        <div>
          <label className={labelClass}>State / Province</label>
          <input
            type="text"
            className={cn(inputClass, errors.state && 'border-red-500/50')}
            value={address.state}
            onChange={e => update('state', e.target.value)}
            placeholder="NY"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>ZIP / Postal Code</label>
          <input
            type="text"
            className={cn(inputClass, errors.zip && 'border-red-500/50')}
            value={address.zip}
            onChange={e => update('zip', e.target.value)}
            placeholder="10001"
          />
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <select
            className={cn(inputClass, errors.country && 'border-red-500/50')}
            value={address.country}
            onChange={e => update('country', e.target.value)}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Phone Number</label>
        <input
          type="tel"
          className={cn(inputClass, errors.phone && 'border-red-500/50')}
          value={address.phone}
          onChange={e => update('phone', e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-11 rounded-xl"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'flex-1 h-11 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400',
            'text-white shadow-lg shadow-cyan-500/20',
            'disabled:opacity-40 disabled:shadow-none',
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Placing Order...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Place Order &mdash; {pricePts.toLocaleString()} pts
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
