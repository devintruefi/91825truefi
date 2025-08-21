"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Home, 
  Car, 
  GraduationCap, 
  CreditCard,
  Building,
  Heart,
  DollarSign,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';

interface LiabilitiesInputProps {
  onSubmit: (liabilities: Record<string, number>) => void;
  onSkip?: () => void;
  initialData?: Record<string, number>;
}

export function LiabilitiesInput({ onSubmit, onSkip, initialData }: LiabilitiesInputProps) {
  const [liabilities, setLiabilities] = useState<Record<string, number>>({
    mortgage: initialData?.mortgage || 0,
    auto_loan: initialData?.auto_loan || 0,
    student_loans: initialData?.student_loans || 0,
    credit_cards: initialData?.credit_cards || 0,
    personal_loan: initialData?.personal_loan || 0,
    medical_debt: initialData?.medical_debt || 0,
    other: initialData?.other || 0
  });

  const [customLiabilities, setCustomLiabilities] = useState<Array<{ name: string; value: number }>>([]);

  const handleLiabilityChange = (key: string, value: string) => {
    const numValue = parseFloat(value.replace(/,/g, '')) || 0;
    setLiabilities(prev => ({ ...prev, [key]: numValue }));
  };

  const addCustomLiability = () => {
    setCustomLiabilities(prev => [...prev, { name: '', value: 0 }]);
  };

  const updateCustomLiability = (index: number, field: 'name' | 'value', value: string | number) => {
    setCustomLiabilities(prev => {
      const updated = [...prev];
      if (field === 'name') {
        updated[index].name = value as string;
      } else {
        updated[index].value = parseFloat(value.toString().replace(/,/g, '')) || 0;
      }
      return updated;
    });
  };

  const removeCustomLiability = (index: number) => {
    setCustomLiabilities(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const allLiabilities = { ...liabilities };
    customLiabilities.forEach(cl => {
      if (cl.name && cl.value > 0) {
        allLiabilities[cl.name.toLowerCase().replace(/\s+/g, '_')] = cl.value;
      }
    });
    onSubmit(allLiabilities);
  };

  const getTotalLiabilities = () => {
    const standardTotal = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
    const customTotal = customLiabilities.reduce((sum, cl) => sum + cl.value, 0);
    return standardTotal + customTotal;
  };

  const liabilityFields = [
    { key: 'mortgage', label: 'Mortgage', icon: Home, placeholder: 'Remaining balance' },
    { key: 'auto_loan', label: 'Auto Loan(s)', icon: Car, placeholder: 'Total owed' },
    { key: 'student_loans', label: 'Student Loans', icon: GraduationCap, placeholder: 'Total balance' },
    { key: 'credit_cards', label: 'Credit Card Debt', icon: CreditCard, placeholder: 'Total balance' },
    { key: 'personal_loan', label: 'Personal Loans', icon: DollarSign, placeholder: 'Total owed' },
    { key: 'medical_debt', label: 'Medical Debt', icon: Heart, placeholder: 'Total owed' }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">What Do You Owe? 💳</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add your debts and loans (skip if none)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Liabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {liabilityFields.map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs flex items-center gap-2">
                <Icon className="h-3 w-3" />
                {label}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="text"
                  placeholder={placeholder}
                  value={liabilities[key] > 0 ? liabilities[key].toLocaleString() : ''}
                  onChange={(e) => handleLiabilityChange(key, e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          ))}

          {/* Custom Liabilities */}
          {customLiabilities.map((cl, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="text"
                placeholder="Debt name"
                value={cl.name}
                onChange={(e) => updateCustomLiability(index, 'name', e.target.value)}
                className="flex-1"
              />
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="text"
                  placeholder="Amount"
                  value={cl.value > 0 ? cl.value.toLocaleString() : ''}
                  onChange={(e) => updateCustomLiability(index, 'value', e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCustomLiability(index)}
                className="h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addCustomLiability}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Other Debt
          </Button>
        </CardContent>
      </Card>

      {/* Total Preview */}
      {getTotalLiabilities() > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Liabilities</span>
              <span className="text-xl font-bold text-red-700 dark:text-red-400">
                ${getTotalLiabilities().toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onSkip && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onSkip}
          >
            Skip for Now
          </Button>
        )}
        <Button 
          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          onClick={handleSubmit}
        >
          <ChevronRight className="h-4 w-4 mr-2" />
          Continue
        </Button>
      </div>
    </div>
  );
}