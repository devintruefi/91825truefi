"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Home, 
  Car, 
  Briefcase, 
  TrendingUp,
  DollarSign,
  Package,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';

interface AssetsInputProps {
  onSubmit: (assets: Record<string, number>) => void;
  onSkip?: () => void;
}

export function AssetsInput({ onSubmit, onSkip }: AssetsInputProps) {
  const [assets, setAssets] = useState<Record<string, number>>({
    home: 0,
    vehicle: 0,
    savings: 0,
    investments: 0,
    retirement: 0,
    business: 0,
    other: 0
  });

  const [customAssets, setCustomAssets] = useState<Array<{ name: string; value: number }>>([]);

  const handleAssetChange = (key: string, value: string) => {
    const numValue = parseFloat(value.replace(/,/g, '')) || 0;
    setAssets(prev => ({ ...prev, [key]: numValue }));
  };

  const addCustomAsset = () => {
    setCustomAssets(prev => [...prev, { name: '', value: 0 }]);
  };

  const updateCustomAsset = (index: number, field: 'name' | 'value', value: string | number) => {
    setCustomAssets(prev => {
      const updated = [...prev];
      if (field === 'name') {
        updated[index].name = value as string;
      } else {
        updated[index].value = parseFloat(value.toString().replace(/,/g, '')) || 0;
      }
      return updated;
    });
  };

  const removeCustomAsset = (index: number) => {
    setCustomAssets(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const allAssets = { ...assets };
    customAssets.forEach(ca => {
      if (ca.name && ca.value > 0) {
        allAssets[ca.name.toLowerCase().replace(/\s+/g, '_')] = ca.value;
      }
    });
    onSubmit(allAssets);
  };

  const getTotalAssets = () => {
    const standardTotal = Object.values(assets).reduce((sum, val) => sum + val, 0);
    const customTotal = customAssets.reduce((sum, ca) => sum + ca.value, 0);
    return standardTotal + customTotal;
  };

  const assetFields = [
    { key: 'home', label: 'Home/Real Estate', icon: Home, placeholder: 'Current market value' },
    { key: 'vehicle', label: 'Vehicle(s)', icon: Car, placeholder: 'Total value' },
    { key: 'savings', label: 'Savings/Checking', icon: DollarSign, placeholder: 'Total in accounts' },
    { key: 'investments', label: 'Investments', icon: TrendingUp, placeholder: 'Stocks, bonds, etc.' },
    { key: 'retirement', label: 'Retirement (401k/IRA)', icon: Briefcase, placeholder: 'Total balance' },
    { key: 'business', label: 'Business Ownership', icon: Package, placeholder: 'Business value' }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">What Do You Own? 💰</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add your major assets (you can skip if you prefer)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assetFields.map(({ key, label, icon: Icon, placeholder }) => (
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
                  value={assets[key] > 0 ? assets[key].toLocaleString() : ''}
                  onChange={(e) => handleAssetChange(key, e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          ))}

          {/* Custom Assets */}
          {customAssets.map((ca, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="text"
                placeholder="Asset name"
                value={ca.name}
                onChange={(e) => updateCustomAsset(index, 'name', e.target.value)}
                className="flex-1"
              />
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="text"
                  placeholder="Value"
                  value={ca.value > 0 ? ca.value.toLocaleString() : ''}
                  onChange={(e) => updateCustomAsset(index, 'value', e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCustomAsset(index)}
                className="h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addCustomAsset}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Other Asset
          </Button>
        </CardContent>
      </Card>

      {/* Total Preview */}
      {getTotalAssets() > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Assets</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">
                ${getTotalAssets().toLocaleString()}
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