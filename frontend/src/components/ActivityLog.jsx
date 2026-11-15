import React from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { CheckCircle2, PlusCircle, Trash2, CalendarCheck, FileEdit, AlertTriangle, Activity } from 'lucide-react'

export default function ActivityLog({ activities = [], maxItems = 5 }) {
  const getIcon = (actionType = '') => {
    const type = actionType.toLowerCase()
    if (type.includes('take') || type.includes('adherence') || type.includes('completed')) {
      return <CheckCircle2 className="text-emerald-500" size={20} />
    }
    if (type.includes('add') || type.includes('created')) {
      return <PlusCircle className="text-teal-600" size={20} />
    }
    if (type.includes('delete') || type.includes('removed')) {
      return <Trash2 className="text-red-500" size={20} />
    }
    if (type.includes('appointment')) {
      return <CalendarCheck className="text-blue-500" size={20} />
    }
    if (type.includes('update') || type.includes('edit')) {
      return <FileEdit className="text-amber-500" size={20} />
    }
    return <Activity className="text-gray-500" size={20} />
  }

  const formatTimestamp = (ts) => {
    if (!ts) return 'recently'
    try {
      const date = typeof ts === 'string' ? parseISO(ts) : new Date(ts)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  const items = activities.slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 bg-white rounded-2xl border border-gray-100 p-6">
        <Activity size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-base font-medium">No recent activity logged yet.</p>
        <p className="text-xs text-gray-400 mt-1">Actions taken by members will show up here.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Activity size={22} className="text-teal-600" />
        Recent Care Activity
      </h3>
      <div className="divide-y divide-gray-100">
        {items.map((act, index) => (
          <div key={act.id || index} className="py-3.5 flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50 flex-shrink-0">
              {getIcon(act.actionType || act.type || act.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-900 leading-snug">
                {act.description || act.message || `${act.actionType || 'Action'} performed`}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  {act.memberName || act.user || 'System'}
                </span>
                <span>•</span>
                <span>{formatTimestamp(act.createdAt || act.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
