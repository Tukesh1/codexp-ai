import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: "increase" | "decrease" | "neutral"
  }
  icon: LucideIcon
  description?: string
  trend?: number[]
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  description,
  trend 
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          
          {change && (
            <div className="flex items-center mt-2">
              <span className={cn(
                "text-sm font-medium",
                change.type === "increase" && "text-green-600",
                change.type === "decrease" && "text-red-600",
                change.type === "neutral" && "text-gray-600"
              )}>
                {change.type === "increase" && "+"}
                {change.value}
              </span>
              <span className="text-sm text-gray-600 ml-1">vs last month</span>
            </div>
          )}
          
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
      
      {trend && trend.length > 0 && (
        <div className="mt-4">
          <div className="flex items-end space-x-1 h-8">
            {trend.map((value, index) => (
              <div
                key={index}
                className="bg-blue-200 rounded-sm flex-1"
                style={{ height: `${(value / Math.max(...trend)) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
