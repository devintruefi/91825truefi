"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlaidConnect } from '@/components/plaid-connect';
import { cn } from '@/lib/utils';
import { 
  Check, 
  ChevronRight,
  Sparkles,
  Trophy,
  Star,
  ArrowUp,
  ArrowDown,
  Shield,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown } from 'lucide-react';

interface BaseComponentProps {
  data: any;
  onComplete: (value: any) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

// Info Card Component - for privacy/security messages
export function InfoCard({ data, onComplete }: BaseComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                {data.icon === '🔒' ? (
                  <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {data.title}
                </h3>
                <div className="space-y-2">
                  {data.points.map((point: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => onComplete(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {data.buttonText || 'Continue'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Button Selection Component
export function ButtonSelection({ data, onComplete, onSkip }: BaseComponentProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    setTimeout(() => onComplete(value), 300); // Small delay for visual feedback
  };

  // Defensive rendering - check if options exist
  const options = data?.options ?? [];
  const hasOptions = Array.isArray(options) && options.length > 0;

  if (!hasOptions) {
    return (
      <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
          We're syncing your options for this step. If this persists, please try refreshing.
        </p>
        <div className="flex gap-2">
          {onSkip && (
            <Button variant="outline" className="flex-1" onClick={onSkip}>
              Skip this step
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title and subtitle */}
      {(data.title || data.subtitle || data.question) && (
        <div className="text-center space-y-1">
          {(data.title || data.question) && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.title || data.question}
            </h3>
          )}
          {data.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-2">
        {options.map((option: any) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                selected === option.value && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              )}
              onClick={() => handleSelect(option.value)}
            >
              <div className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{option.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {option.label}
                    </h4>
                    {option.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {selected === option.value && (
                    <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      {onSkip && (
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          Skip this question
        </Button>
      )}
    </div>
  );
}

// Checkbox Group Component
export function CheckboxGroup({ data, onComplete, onSkip }: BaseComponentProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      setSelected(prev => prev.filter(v => v !== value));
    } else if (selected.length < (data?.maxSelect || 5)) {
      setSelected(prev => [...prev, value]);
    }
  };

  const handleComplete = () => {
    onComplete({ selected, amounts });
  };

  const isValid = selected.length >= (data?.minSelect || 1);
  
  // Defensive rendering - check if options exist
  const options = data?.options ?? [];
  const hasOptions = Array.isArray(options) && options.length > 0;

  if (!hasOptions) {
    return (
      <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
          Loading options for this step...
        </p>
        <div className="flex gap-2">
          {onSkip && (
            <Button variant="outline" className="flex-1" onClick={onSkip}>
              Skip this step
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title and subtitle */}
      {(data.title || data.subtitle) && (
        <div className="text-center space-y-1">
          {data.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.title}
            </h3>
          )}
          {data.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Selection counter */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {selected.length} of {data.maxSelect || 5} selected
        </span>
        {data.helpText && (
          <span className="text-blue-600 dark:text-blue-400">
            {data.helpText}
          </span>
        )}
      </div>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {options.map((option: any, index: number) => (
          <motion.div
            key={option.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-200",
                selected.includes(option.id) && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              )}
              onClick={() => handleToggle(option.id)}
            >
              <div className="flex items-start space-x-3 p-3">
                <Checkbox
                  id={option.id}
                  checked={selected.includes(option.id)}
                  onCheckedChange={() => handleToggle(option.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.label}</span>
                        {option.recommended && (
                          <Badge variant="secondary" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {option.description}
                        </p>
                      )}
                      {data.showAmounts && selected.includes(option.id) && (
                        <div className="mt-2">
                          <Input
                            type="number"
                            placeholder="Target amount ($)"
                            className="max-w-xs"
                            value={amounts[option.id] || ''}
                            onChange={(e) => setAmounts(prev => ({
                              ...prev,
                              [option.id]: parseFloat(e.target.value)
                            }))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {data.maxSelect && (
        <p className="text-sm text-gray-500">
          Select up to {data.maxSelect} ({selected.length} selected)
        </p>
      )}
      
      <div className="flex gap-2">
        <Button 
          className="flex-1"
          onClick={handleComplete}
          disabled={!isValid}
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        {onSkip && (
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

// Card Selection Component
export function CardSelection({ data, onComplete, onSkip }: BaseComponentProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (template: any) => {
    setSelected(template.id);
    onComplete(template);
  };

  // Defensive rendering - handle both 'templates' and 'options' for compatibility
  const templates = data?.templates || data?.options || [];
  const hasTemplates = Array.isArray(templates) && templates.length > 0;

  if (!hasTemplates) {
    return (
      <div className="rounded-xl border p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
          Loading options for this step...
        </p>
        <div className="flex gap-2">
          {onSkip && (
            <Button variant="outline" className="flex-1" onClick={onSkip}>
              Skip this step
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template: any) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "p-4 cursor-pointer transition-all",
                "hover:shadow-lg hover:border-blue-300",
                selected === template.id && "border-blue-500 bg-blue-50 dark:bg-blue-950"
              )}
              onClick={() => handleSelect(template)}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold">{template.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {template.description}
                  </p>
                </div>
                {selected === template.id && (
                  <Check className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {data.allowCustom && (
        <Button variant="outline" className="w-full">
          None of these fit - let me explain
        </Button>
      )}
      
      {onSkip && (
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          Skip this step
        </Button>
      )}
    </div>
  );
}

// Slider Component
export function SliderInput({ data, onComplete, onSkip }: BaseComponentProps) {
  const [value, setValue] = useState<number[]>([data.default || data.min || 5]);
  
  const formatValue = (val: number) => {
    if (data.prefix) return `${data.prefix}${val.toLocaleString()}`;
    return val.toLocaleString();
  };

  const handleComplete = () => {
    onComplete(value[0]);
  };

  // Get risk description based on value
  const getRiskDescription = () => {
    const val = value[0];
    if (data.descriptions) {
      if (val <= 3) return data.descriptions.low;
      if (val <= 7) return data.descriptions.medium;
      return data.descriptions.high;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Title and subtitle */}
      {(data.title || data.subtitle) && (
        <div className="text-center space-y-1">
          {data.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.title}
            </h3>
          )}
          {data.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.subtitle}
            </p>
          )}
        </div>
      )}
      
      <Card className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {formatValue(value[0])}
            </div>
            {data.labels && data.labels[value[0]] && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {data.labels[value[0]]}
              </p>
            )}
          </div>
          
          <Slider
            value={value}
            onValueChange={setValue}
            max={data.max}
            min={data.min}
            step={data.step || 1}
            className="w-full"
          />
          
          {data.labels && (
            <div className="flex justify-between text-xs text-gray-500">
              {Object.entries(data.labels).map(([val, label]) => (
                <span key={val} className={cn(
                  "transition-colors",
                  parseInt(val) === value[0] && "text-blue-600 font-semibold"
                )}>
                  {label}
                </span>
              ))}
            </div>
          )}
          
          {/* Risk description */}
          {getRiskDescription() && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getRiskDescription()}
              </p>
            </div>
          )}
        </div>
      </Card>
      
      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleComplete}>
          Continue
        </Button>
        {onSkip && (
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

// Image Choice Component
export function ImageChoice({ data, onComplete, onSkip }: BaseComponentProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Defensive check for options
  const options = data?.options || [];
  
  if (!Array.isArray(options) || options.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">No options available.</p>
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="w-full">
            Skip this step
          </Button>
        )}
      </div>
    );
  }

  const handleSelect = (option: any) => {
    setSelected(option.id);
    setTimeout(() => onComplete(option), 300);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {options.map((option: any) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              className={cn(
                "p-4 cursor-pointer text-center transition-all",
                "hover:shadow-lg hover:border-blue-300",
                selected === option.id && "border-blue-500 bg-blue-50 dark:bg-blue-950"
              )}
              onClick={() => handleSelect(option)}
            >
              <div className="text-4xl mb-2">{option.image}</div>
              <p className="text-sm font-medium">{option.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      {onSkip && (
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          Skip
        </Button>
      )}
    </div>
  );
}

// Pie Chart Budget Builder
export function PieChartBuilder({ data, onComplete, onSkip }: BaseComponentProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    data.categories.forEach((cat: any) => {
      initial[cat.id] = cat.default || 0;
    });
    return initial;
  });

  const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  
  const handleChange = (id: string, value: number) => {
    setAllocations(prev => ({
      ...prev,
      [id]: Math.max(0, Math.min(100, value))
    }));
  };

  const handleComplete = () => {
    onComplete(allocations);
  };

  const isValid = Math.abs(total - 100) < 1; // Allow for rounding errors

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.categories.map((category: any) => (
          <div key={category.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <span>{category.label}</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={allocations[category.id]}
                  onChange={(e) => handleChange(category.id, parseInt(e.target.value))}
                  className="w-20 text-right"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <Progress value={allocations[category.id]} className="h-2" />
          </div>
        ))}
      </div>
      
      <div className={cn(
        "text-center p-3 rounded-lg",
        isValid ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
      )}>
        Total: {total}% {isValid ? '✓' : `(${total > 100 ? 'Over' : 'Under'} by ${Math.abs(100 - total)}%)`}
      </div>
      
      <div className="flex gap-2">
        <Button 
          className="flex-1"
          onClick={handleComplete}
          disabled={!isValid}
        >
          Continue
        </Button>
        {onSkip && (
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}

// Quick Add Component for Manual Accounts
export function QuickAdd({ data, onComplete, onSkip }: BaseComponentProps) {
  const [values, setValues] = useState<Record<string, number>>({});

  // Defensive check for fields
  const fields = data?.fields || [];
  
  if (!Array.isArray(fields) || fields.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">No fields available to add.</p>
        {onSkip && (
          <Button variant="outline" onClick={onSkip} className="w-full">
            Skip this step
          </Button>
        )}
      </div>
    );
  }

  const handleChange = (id: string, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numValue)) {
      setValues(prev => ({ ...prev, [id]: numValue }));
    } else if (value === '') {
      setValues(prev => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
    }
  };

  const handleComplete = () => {
    onComplete(values);
  };

  const hasAnyValue = Object.keys(values).length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fields.map((field: any) => (
          <div key={field.id} className="flex items-center gap-3">
            <span className="text-2xl">{field.icon}</span>
            <div className="flex-1">
              <label className="text-sm font-medium">{field.label}</label>
              <Input
                type="text"
                placeholder="$0"
                value={values[field.id] ? `$${values[field.id].toLocaleString()}` : ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button 
          className="flex-1"
          onClick={handleComplete}
          disabled={!hasAnyValue}
        >
          {hasAnyValue ? 'Continue' : 'Add at least one account'}
        </Button>
        {onSkip && (
          <Button variant="outline" onClick={onSkip}>
            Skip - I'll add later
          </Button>
        )}
      </div>
    </div>
  );
}

// Plaid Connect Wrapper for Onboarding
function PlaidConnectWrapper({ data, onComplete, onSkip }: BaseComponentProps) {
  const handleSuccess = () => {
    onComplete('connected');
  };

  return (
    <div className="space-y-4">
      {/* Title and subtitle */}
      {(data.title || data.subtitle) && (
        <div className="text-center space-y-1">
          {data.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.title}
            </h3>
          )}
          {data.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Benefits list */}
      {data.benefits && (
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {data.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex gap-2">
        <PlaidConnect 
          onSuccess={handleSuccess}
          className="flex-1"
        />
        {onSkip && (
          <Button variant="outline" onClick={onSkip}>
            I'll do this later
          </Button>
        )}
      </div>
    </div>
  );
}

// Combobox Field Component
function ComboboxField({ field, value, onValueChange, disabled }: {
  field: any;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  
  // Filter options based on the selected country if applicable
  const getFilteredOptions = () => {
    if (field.id === 'state' && field.options) {
      // If we have a country context, filter by that
      // For now, show all options since we don't have the country value in this component
      return field.options;
    }
    return field.options || [];
  };
  
  const filteredOptions = getFilteredOptions();
  const selectedOption = filteredOptions.find((option: any) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : (field.placeholder || "Select...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full">
        <Command>
          <CommandInput placeholder={`Search ${field.label.toLowerCase()}...`} />
          <CommandEmpty>No {field.label.toLowerCase()} found.</CommandEmpty>
          <CommandList>
            {/* Group by US vs CA if applicable */}
            {field.id === 'state' ? (
              <>
                <CommandGroup heading="United States">
                  {filteredOptions
                    .filter((option: any) => option.group === 'US')
                    .map((option: any) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {
                          onValueChange(currentValue === value ? "" : currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
                <CommandGroup heading="Canada">
                  {filteredOptions
                    .filter((option: any) => option.group === 'CA')
                    .map((option: any) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {
                          onValueChange(currentValue === value ? "" : currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            ) : (
              filteredOptions.map((option: any) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Form Component for multi-field input
export function FormInput({ data, onComplete, onSkip, disabled }: BaseComponentProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    data.fields?.forEach((field: any) => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <Card>
        <CardContent className="p-6 space-y-4">
          {data.fields?.map((field: any) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {field.type === 'select' ? (
                <Select
                  value={formData[field.id] || ''}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                  disabled={disabled}
                >
                  <SelectTrigger id={field.id}>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'combobox' ? (
                <ComboboxField
                  field={field}
                  value={formData[field.id] || ''}
                  onValueChange={(value) => handleFieldChange(field.id, value)}
                  disabled={disabled}
                />
              ) : field.type === 'checkbox' ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={formData[field.id] || false}
                    onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                    disabled={disabled}
                  />
                  <label
                    htmlFor={field.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.placeholder}
                  </label>
                </div>
              ) : (
                <Input
                  id={field.id}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  disabled={disabled}
                />
              )}
              
              {errors[field.id] && (
                <p className="text-sm text-red-500">{errors[field.id]}</p>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="flex-1"
            >
              {data.submitLabel || 'Continue'}
            </Button>
            {data.allowSkip && onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                disabled={disabled}
              >
                Skip
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Tradeoffs Component for interactive what-if scenarios
export function TradeoffsInput({ data, onComplete, onSkip, disabled }: BaseComponentProps) {
  const [leverValues, setLeverValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    data.levers?.forEach((lever: any) => {
      initial[lever.id] = lever.value || lever.min || 0;
    });
    return initial;
  });

  const handleLeverChange = (leverId: string, value: number[]) => {
    setLeverValues(prev => ({ ...prev, [leverId]: value[0] }));
  };

  const handleAccept = () => {
    onComplete({ levers: leverValues });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Explore Your Options</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adjust the sliders to see how different choices affect your financial plan
            </p>
          </div>

          {data.levers?.map((lever: any) => (
            <div key={lever.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>{lever.label}</Label>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-lg">
                    {leverValues[lever.id]}
                  </span>
                  {lever.unit && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {lever.unit}
                    </span>
                  )}
                </div>
              </div>
              <Slider
                value={[leverValues[lever.id]]}
                onValueChange={(value) => handleLeverChange(lever.id, value)}
                min={lever.min}
                max={lever.max}
                step={lever.step || 1}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{lever.min}{lever.unit || ''}</span>
                <span>{lever.max}{lever.unit || ''}</span>
              </div>
            </div>
          ))}

          <div className="pt-4 space-y-3">
            {/* Impact preview could go here */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Based on your selections, you'll reach your goals in an estimated timeframe.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAccept}
                disabled={disabled}
                className="flex-1"
              >
                {data.submitLabel || 'Accept Plan'}
              </Button>
              {data.allowSkip && onSkip && (
                <Button
                  variant="outline"
                  onClick={onSkip}
                  disabled={disabled}
                >
                  Skip
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Export all components
// Import the new components
import { AssetsInput } from './assets-input';
import { LiabilitiesInput } from './liabilities-input';

export const OnboardingComponents = {
  'info-card': InfoCard,
  buttons: ButtonSelection,
  'checkbox-group': CheckboxGroup,
  cards: CardSelection,
  slider: SliderInput,
  'image-choice': ImageChoice,
  'pie-chart': PieChartBuilder,
  'quick-add': QuickAdd,
  'plaid': PlaidConnectWrapper,
  'plaid-connect': PlaidConnectWrapper,
  'assetsInput': AssetsInput,
  'liabilitiesInput': LiabilitiesInput,
  'form': FormInput,
  'tradeoffs': TradeoffsInput,
};