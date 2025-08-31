'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// US States with codes and names
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// Canadian Provinces
const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

interface LocationDropdownProps {
  country: 'US' | 'CA';
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationDropdown({
  country = 'US',
  value,
  onChange,
  placeholder = 'Select state...',
  className
}: LocationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const locations = useMemo(() => {
    return country === 'US' ? US_STATES : CANADIAN_PROVINCES;
  }, [country]);

  const filteredLocations = useMemo(() => {
    if (!search) return locations;
    
    const searchLower = search.toLowerCase();
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(searchLower) ||
      loc.code.toLowerCase().includes(searchLower)
    );
  }, [locations, search]);

  const selectedLocation = useMemo(() => {
    return locations.find(loc => loc.code === value);
  }, [locations, value]);

  const handleSelect = useCallback((code: string) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {selectedLocation ? selectedLocation.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={`Search ${country === 'US' ? 'states' : 'provinces'}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No {country === 'US' ? 'state' : 'province'} found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredLocations.map((location) => (
              <CommandItem
                key={location.code}
                value={location.code}
                onSelect={() => handleSelect(location.code)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === location.code ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="flex-1">{location.name}</span>
                <span className="text-muted-foreground text-xs">
                  {location.code}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface LocationFormProps {
  onSubmit: (data: { country: string; state: string }) => void;
  initialCountry?: 'US' | 'CA';
}

export function LocationForm({ onSubmit, initialCountry = 'US' }: LocationFormProps) {
  const [country, setCountry] = useState<'US' | 'CA'>(initialCountry);
  const [state, setState] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state) {
      setError('Please select a state/province');
      return;
    }
    
    onSubmit({ 
      country: country === 'US' ? 'United States' : 'Canada', 
      state 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Country
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={country === 'US' ? 'default' : 'outline'}
            onClick={() => {
              setCountry('US');
              setState('');
            }}
            className="flex-1"
          >
            United States
          </Button>
          <Button
            type="button"
            variant={country === 'CA' ? 'default' : 'outline'}
            onClick={() => {
              setCountry('CA');
              setState('');
            }}
            className="flex-1"
          >
            Canada
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          {country === 'US' ? 'State' : 'Province'}
        </label>
        <LocationDropdown
          country={country}
          value={state}
          onChange={(value) => {
            setState(value);
            setError('');
          }}
          placeholder={`Select ${country === 'US' ? 'state' : 'province'}...`}
        />
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={!state}>
        Continue
      </Button>
    </form>
  );
}