import React from 'react'
import { 
  Plane, 
  Car, 
  Utensils, 
  ShoppingCart, 
  Coffee, 
  Gift, 
  Briefcase, 
  TrendingUp, 
  CreditCard, 
  Dumbbell, 
  Film, 
  Music, 
  HomeIcon, 
  Heart, 
  GraduationCap, 
  Building2, 
  Tag 
} from 'lucide-react'

// Category icon and color mapping
export const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string }> = {
  "Flights": { icon: <Plane className="w-4 h-4" />, color: "bg-blue-100 text-blue-700" },
  "Ride Sharing": { icon: <Car className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-700" },
  "Fast Food": { icon: <Utensils className="w-4 h-4" />, color: "bg-red-100 text-red-700" },
  "Groceries": { icon: <ShoppingCart className="w-4 h-4" />, color: "bg-green-100 text-green-700" },
  "Coffee": { icon: <Coffee className="w-4 h-4" />, color: "bg-orange-100 text-orange-700" },
  "General Merchandise": { icon: <Gift className="w-4 h-4" />, color: "bg-purple-100 text-purple-700" },
  "Salary": { icon: <Briefcase className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-700" },
  "Income": { icon: <TrendingUp className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-700" },
  "Loan Payment": { icon: <CreditCard className="w-4 h-4" />, color: "bg-pink-100 text-pink-700" },
  "Credit Card Payment": { icon: <CreditCard className="w-4 h-4" />, color: "bg-pink-100 text-pink-700" },
  "Gyms": { icon: <Dumbbell className="w-4 h-4" />, color: "bg-teal-100 text-teal-700" },
  "Entertainment": { icon: <Film className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-700" },
  "Music": { icon: <Music className="w-4 h-4" />, color: "bg-pink-100 text-pink-700" },
  "Restaurants": { icon: <Utensils className="w-4 h-4" />, color: "bg-red-100 text-red-700" },
  "Home Improvement": { icon: <HomeIcon className="w-4 h-4" />, color: "bg-gray-100 text-gray-700" },
  "Personal Care": { icon: <Heart className="w-4 h-4" />, color: "bg-pink-100 text-pink-700" },
  "Education": { icon: <GraduationCap className="w-4 h-4" />, color: "bg-blue-100 text-blue-700" },
  "Transfer": { icon: <Building2 className="w-4 h-4" />, color: "bg-gray-100 text-gray-700" },
  "Uncategorized": { icon: <Tag className="w-4 h-4" />, color: "bg-gray-100 text-gray-500" },
  "Other": { icon: <Tag className="w-4 h-4" />, color: "bg-gray-100 text-gray-500" },
} 